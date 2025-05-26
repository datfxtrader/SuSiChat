
import time
import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from collections import defaultdict

logger = logging.getLogger("metrics")

@dataclass
class MetricPoint:
    """Single metric data point"""
    timestamp: float
    value: float
    labels: Dict[str, str] = field(default_factory=dict)

class MetricsCollector:
    """Collects and exposes metrics without external dependencies"""
    
    def __init__(self):
        # Internal metrics storage
        self.metrics_history: Dict[str, List[MetricPoint]] = defaultdict(list)
        self.counters: Dict[str, int] = defaultdict(int)
        self.gauges: Dict[str, float] = defaultdict(float)
        self.histograms: Dict[str, List[float]] = defaultdict(list)
        
        # Performance tracking
        self.operation_times: Dict[str, List[float]] = defaultdict(list)
        
        # Rate tracking
        self.rate_trackers: Dict[str, defaultdict] = defaultdict(lambda: defaultdict(list))
        
        # Keep metrics for last 24 hours
        self.retention_period = 86400  # 24 hours
    
    def record_task_start(self, task_id: str, task_type: str):
        """Record task start"""
        self.gauges[f"active_tasks_{task_type}"] = self.gauges.get(f"active_tasks_{task_type}", 0) + 1
        self.metrics_history[f"task_start_{task_id}"].append(
            MetricPoint(time.time(), 1.0, {"type": task_type})
        )
        logger.debug(f"Task started: {task_id} ({task_type})")
    
    def record_task_end(
        self, 
        task_id: str, 
        task_type: str, 
        status: str, 
        duration: float
    ):
        """Record task completion"""
        self.gauges[f"active_tasks_{task_type}"] = max(0, self.gauges.get(f"active_tasks_{task_type}", 0) - 1)
        self.counters[f"tasks_completed_{task_type}_{status}"] += 1
        self.histograms[f"task_duration_{task_type}"].append(duration)
        
        self.metrics_history[f"task_end_{task_id}"].append(
            MetricPoint(time.time(), duration, {"type": task_type, "status": status})
        )
        logger.debug(f"Task ended: {task_id} ({task_type}) - {status} in {duration:.2f}s")
    
    def record_tool_call(self, tool_name: str, status: str, duration: float = 0):
        """Record tool usage"""
        self.counters[f"tool_calls_{tool_name}_{status}"] += 1
        if duration > 0:
            self.histograms[f"tool_duration_{tool_name}"].append(duration)
        
        logger.debug(f"Tool call: {tool_name} - {status}")
    
    def record_confidence(self, domain: str, confidence: float):
        """Record reasoning confidence"""
        self.histograms[f"confidence_{domain}"].append(confidence)
        logger.debug(f"Confidence recorded: {domain} - {confidence:.2f}")
    
    def record_operation_time(self, operation: str, duration: float):
        """Record operation timing"""
        self.operation_times[operation].append(duration)
        
        # Keep only last 100 measurements per operation
        if len(self.operation_times[operation]) > 100:
            self.operation_times[operation] = self.operation_times[operation][-100:]
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get summary of recent metrics"""
        now = time.time()
        cutoff = now - 3600  # Last hour
        
        # Clean old metrics
        self._cleanup_old_metrics(cutoff)
        
        summary = {
            "active_tasks": dict(self.gauges),
            "completed_tasks": dict(self.counters),
            "recent_completions": [],
            "tool_usage": {},
            "performance": {},
            "confidence_stats": {}
        }
        
        # Process recent completions
        for key, points in self.metrics_history.items():
            if "task_end" in key:
                recent_points = [p for p in points if p.timestamp > cutoff]
                for point in recent_points:
                    summary["recent_completions"].append({
                        "timestamp": point.timestamp,
                        "duration": point.value,
                        "type": point.labels.get("type"),
                        "status": point.labels.get("status")
                    })
        
        # Tool usage statistics
        for key, count in self.counters.items():
            if "tool_calls" in key:
                parts = key.split("_")
                if len(parts) >= 4:
                    tool_name = parts[2]
                    status = parts[3]
                    if tool_name not in summary["tool_usage"]:
                        summary["tool_usage"][tool_name] = {}
                    summary["tool_usage"][tool_name][status] = count
        
        # Performance statistics
        for operation, times in self.operation_times.items():
            if times:
                summary["performance"][operation] = {
                    "count": len(times),
                    "avg_time": sum(times) / len(times),
                    "min_time": min(times),
                    "max_time": max(times)
                }
        
        # Confidence statistics
        for key, values in self.histograms.items():
            if "confidence" in key and values:
                domain = key.replace("confidence_", "")
                summary["confidence_stats"][domain] = {
                    "count": len(values),
                    "avg_confidence": sum(values) / len(values),
                    "min_confidence": min(values),
                    "max_confidence": max(values)
                }
        
        return summary
    
    def _cleanup_old_metrics(self, cutoff_time: float):
        """Remove metrics older than cutoff time"""
        for key in list(self.metrics_history.keys()):
            self.metrics_history[key] = [
                point for point in self.metrics_history[key]
                if point.timestamp > cutoff_time
            ]
            
            # Remove empty entries
            if not self.metrics_history[key]:
                del self.metrics_history[key]
    
    def get_system_health(self) -> Dict[str, Any]:
        """Get overall system health status"""
        try:
            # Calculate error rates
            total_tasks = sum(count for key, count in self.counters.items() if "tasks_completed" in key)
            failed_tasks = sum(count for key, count in self.counters.items() if "tasks_completed" in key and "failed" in key)
            
            error_rate = (failed_tasks / total_tasks) if total_tasks > 0 else 0
            
            # Determine health status
            if error_rate > 0.2:
                health_status = "critical"
            elif error_rate > 0.1:
                health_status = "degraded"
            elif error_rate > 0.05:
                health_status = "warning"
            else:
                health_status = "healthy"
            
            return {
                "overall_health": health_status,
                "error_rate": error_rate,
                "total_tasks": total_tasks,
                "failed_tasks": failed_tasks,
                "active_tasks": sum(self.gauges.values()),
                "uptime": time.time(),
                "metrics_count": len(self.metrics_history)
            }
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                "overall_health": "critical",
                "error": str(e),
                "timestamp": time.time()
            }
    
    def reset_metrics(self):
        """Reset all metrics (useful for testing)"""
        self.metrics_history.clear()
        self.counters.clear()
        self.gauges.clear()
        self.histograms.clear()
        self.operation_times.clear()
        logger.info("All metrics reset")
    
    def calculate_percentiles(self, values: List[float]) -> Dict[str, float]:
        """Calculate percentiles for a list of values"""
        if not values:
            return {}
            
        sorted_values = sorted(values)
        n = len(sorted_values)
        
        if n == 1:
            return {"p50": sorted_values[0], "p75": sorted_values[0], 
                   "p90": sorted_values[0], "p95": sorted_values[0], "p99": sorted_values[0]}
        
        # Use proper percentile calculation
        def get_percentile(p):
            idx = (n - 1) * p
            if idx == int(idx):
                return sorted_values[int(idx)]
            else:
                lower = sorted_values[int(idx)]
                upper = sorted_values[int(idx) + 1]
                return lower + (upper - lower) * (idx - int(idx))
        
        return {
            "p50": get_percentile(0.50),
            "p75": get_percentile(0.75),
            "p90": get_percentile(0.90),
            "p95": get_percentile(0.95),
            "p99": get_percentile(0.99)
        }
    
    def record_rate_limited_operation(self, operation: str, timestamp: Optional[float] = None):
        """Track rate-limited operations"""
        timestamp = timestamp or time.time()
        hour_bucket = int(timestamp // 3600)
        self.rate_trackers[operation][hour_bucket].append(timestamp)
        
        # Keep only last 24 hours
        cutoff_bucket = hour_bucket - 24
        for bucket in list(self.rate_trackers[operation].keys()):
            if bucket < cutoff_bucket:
                del self.rate_trackers[operation][bucket]
    
    def get_operation_rate(self, operation: str, window_seconds: int = 60) -> float:
        """Calculate operations per second over a time window"""
        if operation not in self.rate_trackers:
            return 0.0
            
        now = time.time()
        cutoff = now - window_seconds
        
        total_ops = 0
        for timestamps in self.rate_trackers[operation].values():
            total_ops += sum(1 for ts in timestamps if ts > cutoff)
        
        return total_ops / window_seconds if window_seconds > 0 else 0.0
    
    def get_enhanced_metrics(self) -> Dict[str, Any]:
        """Get enhanced metrics with percentiles and advanced analytics"""
        enhanced = {
            "basic_metrics": self.get_metrics_summary(),
            "percentiles": {},
            "trends": {},
            "alerts": []
        }
        
        # Calculate percentiles for operation times
        for operation, times in self.operation_times.items():
            if times:
                enhanced["percentiles"][operation] = self.calculate_percentiles(times)
        
        # Calculate percentiles for histogram data
        for key, values in self.histograms.items():
            if values and len(values) > 5:
                enhanced["percentiles"][key] = self.calculate_percentiles(values)
        
        # Generate alerts for anomalies
        for operation, times in self.operation_times.items():
            if len(times) > 10:
                recent_avg = sum(times[-5:]) / 5
                overall_avg = sum(times) / len(times)
                if recent_avg > overall_avg * 2:
                    enhanced["alerts"].append({
                        "type": "performance_degradation",
                        "operation": operation,
                        "message": f"{operation} is running 2x slower than usual"
                    })
        
        return enhanced
