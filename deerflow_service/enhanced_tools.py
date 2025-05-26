
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Type, Callable, Union
import inspect
import asyncio
from dataclasses import dataclass, field
from enum import Enum
import aiohttp
import json
import time
import logging
from functools import lru_cache

logger = logging.getLogger("enhanced_tools")

class ToolCategory(Enum):
    INFORMATION_GATHERING = "information_gathering"
    FINANCIAL_ANALYSIS = "financial_analysis"
    COMPUTATION = "computation"
    MEMORY = "memory"
    COMMUNICATION = "communication"
    DATA_PROCESSING = "data_processing"

@dataclass
class ToolParameter:
    """Enhanced tool parameter definition"""
    name: str
    type: Type
    description: str
    default: Any = None
    required: bool = True
    validator: Optional[Callable] = None
    
    def validate(self, value: Any) -> bool:
        """Validate parameter value"""
        if self.validator:
            return self.validator(value)
        return isinstance(value, self.type)

@dataclass
class ToolResult:
    """Standardized tool result"""
    success: bool
    data: Any
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    execution_time: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "data": self.data,
            "error": self.error,
            "metadata": self.metadata,
            "execution_time": self.execution_time
        }

class BaseTool(ABC):
    """Enhanced base tool with validation and metrics"""
    
    def __init__(self, name: str, description: str, category: ToolCategory):
        self.name = name
        self.description = description
        self.category = category
        self.parameters: List[ToolParameter] = []
        self.execution_count = 0
        self.total_execution_time = 0.0
        self.error_count = 0
    
    @abstractmethod
    async def execute(self, **kwargs) -> ToolResult:
        """Execute the tool with given parameters"""
        pass
    
    def add_parameter(self, parameter: ToolParameter):
        """Add a parameter definition"""
        self.parameters.append(parameter)
    
    async def validate_and_execute(self, **kwargs) -> ToolResult:
        """Validate parameters and execute tool"""
        start_time = time.time()
        
        # Validate parameters
        validation_errors = []
        for param in self.parameters:
            if param.required and param.name not in kwargs:
                validation_errors.append(f"Missing required parameter: {param.name}")
                continue
            
            if param.name in kwargs:
                value = kwargs[param.name]
                if not param.validate(value):
                    validation_errors.append(
                        f"Invalid type for {param.name}: expected {param.type.__name__}"
                    )
        
        if validation_errors:
            self.error_count += 1
            return ToolResult(
                success=False,
                data=None,
                error="; ".join(validation_errors)
            )
        
        # Execute with timing
        try:
            result = await self.execute(**kwargs)
            execution_time = time.time() - start_time
            
            self.execution_count += 1
            self.total_execution_time += execution_time
            
            result.execution_time = execution_time
            return result
            
        except Exception as e:
            self.error_count += 1
            execution_time = time.time() - start_time
            
            return ToolResult(
                success=False,
                data=None,
                error=str(e),
                execution_time=execution_time
            )
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get tool execution metrics"""
        avg_execution_time = (
            self.total_execution_time / self.execution_count 
            if self.execution_count > 0 else 0
        )
        
        return {
            "name": self.name,
            "execution_count": self.execution_count,
            "error_count": self.error_count,
            "success_rate": (
                (self.execution_count - self.error_count) / self.execution_count 
                if self.execution_count > 0 else 0
            ),
            "average_execution_time": avg_execution_time,
            "total_execution_time": self.total_execution_time
        }

class WebSearchTool(BaseTool):
    """Enhanced web search tool with multiple providers"""
    
    def __init__(self, providers: Dict[str, Any]):
        super().__init__(
            name="web_search",
            description="Search the web using multiple providers",
            category=ToolCategory.INFORMATION_GATHERING
        )
        
        self.providers = providers
        self.session = None
        
        # Define parameters
        self.add_parameter(ToolParameter(
            name="query",
            type=str,
            description="Search query",
            required=True,
            validator=lambda x: len(x.strip()) > 0
        ))
        
        self.add_parameter(ToolParameter(
            name="max_results",
            type=int,
            description="Maximum number of results",
            default=10,
            required=False,
            validator=lambda x: 1 <= x <= 50
        ))
        
        self.add_parameter(ToolParameter(
            name="provider",
            type=str,
            description="Search provider to use",
            default="default",
            required=False
        ))
    
    async def execute(self, **kwargs) -> ToolResult:
        """Execute web search"""
        query = kwargs.get("query")
        max_results = kwargs.get("max_results", 10)
        provider = kwargs.get("provider", "default")
        
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        try:
            # Use appropriate provider
            if provider in self.providers:
                results = await self._search_with_provider(
                    query, max_results, self.providers[provider]
                )
            else:
                # Fallback to default search
                results = await self._default_search(query, max_results)
            
            return ToolResult(
                success=True,
                data=results,
                metadata={
                    "query": query,
                    "provider": provider,
                    "result_count": len(results)
                }
            )
            
        except Exception as e:
            return ToolResult(
                success=False,
                data=None,
                error=str(e)
            )
    
    async def _search_with_provider(
        self, 
        query: str, 
        max_results: int, 
        provider_config: Dict
    ) -> List[Dict]:
        """Search using specific provider"""
        url = provider_config.get("url")
        api_key = provider_config.get("api_key")
        
        params = {
            "q": query,
            "count": max_results,
            "key": api_key
        }
        
        async with self.session.get(url, params=params) as response:
            if response.status == 200:
                data = await response.json()
                return self._parse_provider_results(data, provider_config.get("parser", "default"))
            else:
                raise Exception(f"Search failed with status {response.status}")
    
    async def _default_search(self, query: str, max_results: int) -> List[Dict]:
        """Default search implementation"""
        return [
            {
                "title": f"Result for: {query}",
                "url": "https://example.com",
                "snippet": "Search result snippet",
                "relevance": 0.8
            }
        ]
    
    def _parse_provider_results(self, data: Dict, parser: str) -> List[Dict]:
        """Parse results based on provider format"""
        return data.get("results", [])

class FinancialDataTool(BaseTool):
    """Enhanced financial data tool with real-time capabilities"""
    
    def __init__(self, data_sources: Dict[str, Any], cache_manager: Any):
        super().__init__(
            name="financial_data",
            description="Get real-time financial market data",
            category=ToolCategory.FINANCIAL_ANALYSIS
        )
        
        self.data_sources = data_sources
        self.cache_manager = cache_manager
        self.session = None
        
        # Define parameters
        self.add_parameter(ToolParameter(
            name="symbol",
            type=str,
            description="Financial symbol (e.g., EURUSD, BTC-USD)",
            required=True,
            validator=lambda x: len(x) > 0
        ))
        
        self.add_parameter(ToolParameter(
            name="data_type",
            type=str,
            description="Type of data (price, volume, indicators)",
            default="price",
            required=False
        ))
        
        self.add_parameter(ToolParameter(
            name="timeframe",
            type=str,
            description="Data timeframe",
            default="1d",
            required=False
        ))
    
    async def execute(self, **kwargs) -> ToolResult:
        """Get financial data"""
        symbol = kwargs.get("symbol")
        data_type = kwargs.get("data_type", "price")
        timeframe = kwargs.get("timeframe", "1d")
        
        # Check cache first
        cache_key = f"financial:{symbol}:{data_type}:{timeframe}"
        
        try:
            cached_data = await self.cache_manager.get(cache_key) if self.cache_manager else None
            
            if cached_data:
                return ToolResult(
                    success=True,
                    data=cached_data,
                    metadata={"from_cache": True}
                )
        except:
            pass
        
        # Fetch from data sources
        try:
            data = await self._fetch_financial_data(symbol, data_type, timeframe)
            
            # Cache the data
            if self.cache_manager:
                try:
                    await self.cache_manager.set(cache_key, data, ttl=60)
                except:
                    pass
            
            return ToolResult(
                success=True,
                data=data,
                metadata={
                    "symbol": symbol,
                    "data_type": data_type,
                    "timeframe": timeframe,
                    "from_cache": False
                }
            )
            
        except Exception as e:
            return ToolResult(
                success=False,
                data=None,
                error=str(e)
            )
    
    async def _fetch_financial_data(
        self, 
        symbol: str, 
        data_type: str, 
        timeframe: str
    ) -> Dict[str, Any]:
        """Fetch data from appropriate source"""
        # Mock implementation for now
        return {
            "symbol": symbol,
            "price": 1.0950,
            "change": 0.0025,
            "change_percent": 0.23,
            "volume": 1000000,
            "timestamp": time.time()
        }

class CodeExecutionTool(BaseTool):
    """Enhanced code execution with sandboxing"""
    
    def __init__(self, sandbox_config: Dict[str, Any]):
        super().__init__(
            name="code_execution",
            description="Execute Python code safely in sandbox",
            category=ToolCategory.COMPUTATION
        )
        
        self.sandbox_config = sandbox_config
        self.allowed_modules = sandbox_config.get("allowed_modules", ["math", "statistics", "json"])
        self.timeout = sandbox_config.get("timeout", 30)
        
        # Define parameters
        self.add_parameter(ToolParameter(
            name="code",
            type=str,
            description="Python code to execute",
            required=True
        ))
        
        self.add_parameter(ToolParameter(
            name="context",
            type=dict,
            description="Variables and context for execution",
            default={},
            required=False
        ))
    
    async def execute(self, **kwargs) -> ToolResult:
        """Execute code in sandbox"""
        code = kwargs.get("code")
        context = kwargs.get("context", {})
        
        try:
            # Validate code safety
            if not self._is_code_safe(code):
                return ToolResult(
                    success=False,
                    data=None,
                    error="Code contains unsafe operations"
                )
            
            # Execute in sandbox with timeout
            result = await asyncio.wait_for(
                self._execute_in_sandbox(code, context),
                timeout=self.timeout
            )
            
            return ToolResult(
                success=True,
                data=result,
                metadata={"code_length": len(code)}
            )
            
        except asyncio.TimeoutError:
            return ToolResult(
                success=False,
                data=None,
                error=f"Code execution timed out after {self.timeout}s"
            )
        except Exception as e:
            return ToolResult(
                success=False,
                data=None,
                error=str(e)
            )
    
    def _is_code_safe(self, code: str) -> bool:
        """Check if code is safe to execute"""
        import ast
        
        try:
            tree = ast.parse(code)
            
            # Check for dangerous operations
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    # Check if imported module is allowed
                    for alias in node.names:
                        if alias.name not in self.allowed_modules:
                            return False
                
                elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    # Check for dangerous function names
                    if node.name.startswith('_'):
                        return False
            
            return True
            
        except:
            return False
    
    async def _execute_in_sandbox(self, code: str, context: Dict) -> Any:
        """Execute code in isolated environment"""
        # Create safe execution environment
        safe_globals = {
            "__builtins__": {
                "len": len,
                "range": range,
                "sum": sum,
                "max": max,
                "min": min,
                "abs": abs,
                "round": round,
                "sorted": sorted,
                "list": list,
                "dict": dict,
                "set": set,
                "tuple": tuple,
                "str": str,
                "int": int,
                "float": float,
                "bool": bool
            }
        }
        
        # Add allowed modules
        for module_name in self.allowed_modules:
            if module_name == "math":
                import math
                safe_globals["math"] = math
            elif module_name == "statistics":
                import statistics
                safe_globals["statistics"] = statistics
            elif module_name == "json":
                import json
                safe_globals["json"] = json
        
        # Add context variables
        safe_globals.update(context)
        
        # Execute code
        exec_globals = {}
        exec(code, safe_globals, exec_globals)
        
        # Return the result
        if "result" in exec_globals:
            return exec_globals["result"]
        else:
            # Try to evaluate the last expression
            import ast
            tree = ast.parse(code)
            if tree.body and isinstance(tree.body[-1], ast.Expr):
                return eval(compile(ast.Expression(tree.body[-1].value), 
                                  '<string>', 'eval'), safe_globals)
        
        return None

class DependencyContainer:
    """Simple dependency injection container"""
    
    def __init__(self):
        self.services = {}
        self.singletons = {}
    
    def register(self, interface: Type, implementation: Union[Type, Any], singleton: bool = True):
        """Register a service"""
        self.services[interface] = {
            "implementation": implementation,
            "singleton": singleton
        }
    
    def resolve(self, interface: Type) -> Any:
        """Resolve a service"""
        if interface not in self.services:
            return None
        
        service_config = self.services[interface]
        
        if service_config["singleton"]:
            if interface not in self.singletons:
                if inspect.isclass(service_config["implementation"]):
                    self.singletons[interface] = service_config["implementation"]()
                else:
                    self.singletons[interface] = service_config["implementation"]
            
            return self.singletons[interface]
        else:
            if inspect.isclass(service_config["implementation"]):
                return service_config["implementation"]()
            else:
                return service_config["implementation"]

class EnhancedToolRegistry:
    """Enhanced tool registry with dependency injection"""
    
    def __init__(self, container: DependencyContainer):
        self.container = container
        self.tools: Dict[str, BaseTool] = {}
        self.tool_metrics: Dict[str, List[float]] = {}
    
    def register(self, tool_class: Type[BaseTool], **kwargs):
        """Register a tool with dependency injection"""
        # Resolve dependencies
        resolved_kwargs = {}
        
        # Get constructor signature
        sig = inspect.signature(tool_class.__init__)
        
        for param_name, param in sig.parameters.items():
            if param_name == 'self':
                continue
                
            if param_name in kwargs:
                resolved_kwargs[param_name] = kwargs[param_name]
            elif param.annotation != param.empty:
                # Try to resolve from container
                resolved = self.container.resolve(param.annotation)
                if resolved:
                    resolved_kwargs[param_name] = resolved
        
        # Create tool instance
        tool = tool_class(**resolved_kwargs)
        self.tools[tool.name] = tool
        
        logger.info(f"Registered tool: {tool.name} with category: {tool.category.value}")
    
    async def execute_tool(
        self, 
        tool_name: str, 
        **kwargs
    ) -> ToolResult:
        """Execute a tool by name"""
        if tool_name not in self.tools:
            return ToolResult(
                success=False,
                data=None,
                error=f"Tool '{tool_name}' not found"
            )
        
        tool = self.tools[tool_name]
        result = await tool.validate_and_execute(**kwargs)
        
        # Record metrics
        if tool_name not in self.tool_metrics:
            self.tool_metrics[tool_name] = []
        
        if result.execution_time:
            self.tool_metrics[tool_name].append(result.execution_time)
        
        return result
    
    def get_tools_by_category(self, category: ToolCategory) -> List[BaseTool]:
        """Get all tools in a category"""
        return [
            tool for tool in self.tools.values() 
            if tool.category == category
        ]
    
    def get_all_metrics(self) -> Dict[str, Dict[str, Any]]:
        """Get metrics for all tools"""
        metrics = {}
        
        for tool_name, tool in self.tools.items():
            metrics[tool_name] = tool.get_metrics()
        
        return metrics

class CacheManager:
    """Simple cache manager for tools"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.cache = {}
        self.ttl_cache = {}
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if key in self.ttl_cache:
            if time.time() > self.ttl_cache[key]:
                # TTL expired
                del self.cache[key]
                del self.ttl_cache[key]
                return None
        
        return self.cache.get(key)
    
    async def set(self, key: str, value: Any, ttl: int = 300):
        """Set value in cache with TTL"""
        self.cache[key] = value
        self.ttl_cache[key] = time.time() + ttl
    
    async def delete(self, key: str):
        """Delete key from cache"""
        self.cache.pop(key, None)
        self.ttl_cache.pop(key, None)
    
    def size(self) -> int:
        """Get cache size"""
        return len(self.cache)
