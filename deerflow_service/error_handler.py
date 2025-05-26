
"""
Comprehensive Error Handling System for DeerFlow

This module provides robust error handling, recovery mechanisms, and
failure analysis for the DeerFlow agent system.
"""

import asyncio
import logging
import traceback
import time
from typing import Dict, Any, Optional, Callable, List, Union
from dataclasses import dataclass, field
from enum import Enum
from functools import wraps
import inspect

logger = logging.getLogger("error_handler")

class ErrorSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ErrorCategory(Enum):
    NETWORK = "network"
    API = "api"
    VALIDATION = "validation"
    RESOURCE = "resource"
    LOGIC = "logic"
    SYSTEM = "system"

@dataclass
class ErrorContext:
    """Context information for an error"""
    timestamp: float
    function_name: str
    module_name: str
    args: tuple
    kwargs: dict
    stack_trace: str
    user_id: Optional[str] = None
    task_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class ErrorInfo:
    """Detailed error information"""
    error_type: str
    message: str
    severity: ErrorSeverity
    category: ErrorCategory
    context: ErrorContext
    retry_count: int = 0
    max_retries: int = 3
    recovery_strategy: Optional[str] = None
    user_message: Optional[str] = None

class RetryStrategy:
    """Configurable retry strategy"""
    
    def __init__(
        self,
        max_retries: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        exponential_base: float = 2.0,
        jitter: bool = True
    ):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.jitter = jitter
    
    def get_delay(self, attempt: int) -> float:
        """Calculate delay for given attempt number"""
        delay = min(
            self.base_delay * (self.exponential_base ** attempt),
            self.max_delay
        )
        
        if self.jitter:
            import random
            delay = delay * (0.5 + random.random() * 0.5)
        
        return delay
    
    def should_retry(self, attempt: int, error: Exception) -> bool:
        """Determine if retry should be attempted"""
        if attempt >= self.max_retries:
            return False
        
        # Don't retry validation errors
        if isinstance(error, (ValueError, TypeError)):
            return False
        
        # Don't retry authentication errors
        if "authentication" in str(error).lower() or "unauthorized" in str(error).lower():
            return False
        
        return True

class CircuitBreaker:
    """Circuit breaker pattern implementation"""
    
    def __init__(
        self,
        failure_threshold: int = 5,
        timeout: float = 60.0,
        expected_exception: type = Exception
    ):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.expected_exception = expected_exception
        
        self.failure_count = 0
        self.last_failure_time = 0
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    def __call__(self, func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if self.state == "OPEN":
                if time.time() - self.last_failure_time > self.timeout:
                    self.state = "HALF_OPEN"
                    logger.info(f"Circuit breaker for {func.__name__} moving to HALF_OPEN")
                else:
                    raise Exception(f"Circuit breaker OPEN for {func.__name__}")
            
            try:
                result = await func(*args, **kwargs)
                
                # Success resets the circuit breaker
                if self.state == "HALF_OPEN":
                    self.state = "CLOSED"
                    self.failure_count = 0
                    logger.info(f"Circuit breaker for {func.__name__} reset to CLOSED")
                
                return result
                
            except self.expected_exception as e:
                self.failure_count += 1
                self.last_failure_time = time.time()
                
                if self.failure_count >= self.failure_threshold:
                    self.state = "OPEN"
                    logger.warning(f"Circuit breaker OPENED for {func.__name__} after {self.failure_count} failures")
                
                raise
        
        return wrapper

class ErrorHandler:
    """Comprehensive error handling and recovery system"""
    
    def __init__(self):
        self.error_history: List[ErrorInfo] = []
        self.retry_strategies: Dict[str, RetryStrategy] = {}
        self.recovery_handlers: Dict[str, Callable] = {}
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        self.error_stats: Dict[str, int] = {}
        
        # Default retry strategies
        self.set_retry_strategy("default", RetryStrategy())
        self.set_retry_strategy("api_call", RetryStrategy(max_retries=5, base_delay=2.0))
        self.set_retry_strategy("network", RetryStrategy(max_retries=3, base_delay=1.0))
        
    def set_retry_strategy(self, name: str, strategy: RetryStrategy):
        """Set a named retry strategy"""
        self.retry_strategies[name] = strategy
        
    def register_recovery_handler(self, error_type: str, handler: Callable):
        """Register a recovery handler for specific error types"""
        self.recovery_handlers[error_type] = handler
        
    def add_circuit_breaker(self, name: str, breaker: CircuitBreaker):
        """Add a circuit breaker for a specific operation"""
        self.circuit_breakers[name] = breaker
    
    def with_retry(self, strategy_name: str = "default"):
        """Decorator for automatic retry logic"""
        
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                strategy = self.retry_strategies.get(strategy_name, self.retry_strategies["default"])
                
                for attempt in range(strategy.max_retries + 1):
                    try:
                        if inspect.iscoroutinefunction(func):
                            return await func(*args, **kwargs)
                        else:
                            return func(*args, **kwargs)
                            
                    except Exception as e:
                        if not strategy.should_retry(attempt, e):
                            await self._handle_error(e, func, args, kwargs, attempt)
                            raise
                        
                        if attempt < strategy.max_retries:
                            delay = strategy.get_delay(attempt)
                            logger.warning(f"Retry {attempt + 1}/{strategy.max_retries} for {func.__name__} after {delay:.2f}s")
                            await asyncio.sleep(delay)
                        else:
                            await self._handle_error(e, func, args, kwargs, attempt)
                            raise
                
            return wrapper
        return decorator
    
    def with_circuit_breaker(self, breaker_name: str):
        """Decorator for circuit breaker protection"""
        
        def decorator(func):
            if breaker_name not in self.circuit_breakers:
                self.circuit_breakers[breaker_name] = CircuitBreaker()
            
            return self.circuit_breakers[breaker_name](func)
        
        return decorator
    
    async def _handle_error(
        self,
        error: Exception,
        func: Callable,
        args: tuple,
        kwargs: dict,
        retry_count: int = 0
    ):
        """Internal error handling logic"""
        
        # Create error context
        context = ErrorContext(
            timestamp=time.time(),
            function_name=func.__name__,
            module_name=func.__module__,
            args=args,
            kwargs=kwargs,
            stack_trace=traceback.format_exc(),
            user_id=kwargs.get("user_id"),
            task_id=kwargs.get("task_id")
        )
        
        # Classify error
        severity = self._classify_severity(error)
        category = self._classify_category(error)
        
        # Create error info
        error_info = ErrorInfo(
            error_type=type(error).__name__,
            message=str(error),
            severity=severity,
            category=category,
            context=context,
            retry_count=retry_count
        )
        
        # Store error
        self.error_history.append(error_info)
        self.error_stats[error_info.error_type] = self.error_stats.get(error_info.error_type, 0) + 1
        
        # Log error
        log_level = {
            ErrorSeverity.LOW: logging.INFO,
            ErrorSeverity.MEDIUM: logging.WARNING,
            ErrorSeverity.HIGH: logging.ERROR,
            ErrorSeverity.CRITICAL: logging.CRITICAL
        }[severity]
        
        logger.log(log_level, f"Error in {func.__name__}: {error_info.message}")
        
        # Attempt recovery
        if error_info.error_type in self.recovery_handlers:
            try:
                recovery_result = await self.recovery_handlers[error_info.error_type](error_info)
                if recovery_result:
                    logger.info(f"Successfully recovered from {error_info.error_type}")
                    return recovery_result
            except Exception as recovery_error:
                logger.error(f"Recovery failed: {recovery_error}")
    
    def _classify_severity(self, error: Exception) -> ErrorSeverity:
        """Classify error severity"""
        
        error_str = str(error).lower()
        
        # Critical errors
        if any(keyword in error_str for keyword in ["out of memory", "disk full", "connection refused"]):
            return ErrorSeverity.CRITICAL
        
        # High severity errors
        if any(keyword in error_str for keyword in ["timeout", "connection", "api key"]):
            return ErrorSeverity.HIGH
        
        # Medium severity errors
        if any(keyword in error_str for keyword in ["rate limit", "quota", "temporary"]):
            return ErrorSeverity.MEDIUM
        
        return ErrorSeverity.LOW
    
    def _classify_category(self, error: Exception) -> ErrorCategory:
        """Classify error category"""
        
        error_str = str(error).lower()
        
        if any(keyword in error_str for keyword in ["connection", "network", "timeout"]):
            return ErrorCategory.NETWORK
        
        if any(keyword in error_str for keyword in ["api", "key", "unauthorized", "rate limit"]):
            return ErrorCategory.API
        
        if any(keyword in error_str for keyword in ["validation", "invalid", "missing"]):
            return ErrorCategory.VALIDATION
        
        if any(keyword in error_str for keyword in ["memory", "disk", "resource"]):
            return ErrorCategory.RESOURCE
        
        if isinstance(error, (ValueError, TypeError, AttributeError)):
            return ErrorCategory.LOGIC
        
        return ErrorCategory.SYSTEM
    
    def get_error_summary(self) -> Dict[str, Any]:
        """Get summary of error statistics"""
        
        if not self.error_history:
            return {"message": "No errors recorded"}
        
        # Recent errors (last hour)
        recent_cutoff = time.time() - 3600
        recent_errors = [e for e in self.error_history if e.context.timestamp > recent_cutoff]
        
        # Error distribution by type
        error_distribution = {}
        for error_type, count in self.error_stats.items():
            error_distribution[error_type] = count
        
        # Severity distribution
        severity_counts = {}
        for error in self.error_history:
            severity_counts[error.severity.value] = severity_counts.get(error.severity.value, 0) + 1
        
        return {
            "total_errors": len(self.error_history),
            "recent_errors": len(recent_errors),
            "error_distribution": error_distribution,
            "severity_distribution": severity_counts,
            "most_common_error": max(self.error_stats.items(), key=lambda x: x[1])[0] if self.error_stats else None,
            "circuit_breaker_states": {name: breaker.state for name, breaker in self.circuit_breakers.items()}
        }
    
    def clear_error_history(self, older_than_hours: int = 24):
        """Clear old error history"""
        
        cutoff = time.time() - (older_than_hours * 3600)
        self.error_history = [e for e in self.error_history if e.context.timestamp > cutoff]
        
        logger.info(f"Cleared errors older than {older_than_hours} hours")

# Global error handler instance
error_handler = ErrorHandler()

# Convenience decorators
def with_retry(strategy: str = "default"):
    """Convenience decorator for retry logic"""
    return error_handler.with_retry(strategy)

def with_circuit_breaker(name: str):
    """Convenience decorator for circuit breaker"""
    return error_handler.with_circuit_breaker(name)
