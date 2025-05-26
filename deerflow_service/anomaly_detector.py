
"""
Anomaly Detection System for DeerFlow

This module provides anomaly detection capabilities to identify
unusual patterns in system behavior and performance metrics.
"""

import statistics
import time
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from collections import deque

logger = logging.getLogger("anomaly_detector")

@dataclass
class AnomalyAlert:
    """Represents an anomaly detection alert"""
    metric_name: str
    value: float
    expected_range: tuple
    severity: str  # "low", "medium", "high", "critical"
    timestamp: float
    z_score: float
    description: str

class AnomalyDetector:
    """Detect anomalies in system behavior"""
    
    def __init__(self, window_size: int = 100, z_threshold: float = 3.0):
        self.window_size = window_size
        self.z_threshold = z_threshold
        self.baselines: Dict[str, Dict[str, float]] = {}
        self.metric_history: Dict[str, deque] = {}
        self.alerts: List[AnomalyAlert] = []
        
    def add_metric_value(self, metric_name: str, value: float):
        """Add a new metric value and check for anomalies"""
        # Initialize history if needed
        if metric_name not in self.metric_history:
            self.metric_history[metric_name] = deque(maxlen=self.window_size)
        
        # Add value to history
        self.metric_history[metric_name].append(value)
        
        # Update baseline if we have enough data
        if len(self.metric_history[metric_name]) >= 10:
            self._update_baseline(metric_name)
            
            # Check for anomaly
            if self.is_anomaly(metric_name, value):
                alert = self._create_alert(metric_name, value)
                self.alerts.append(alert)
                logger.warning(f"Anomaly detected: {alert.description}")
                return alert
        
        return None
        
    def _update_baseline(self, metric_name: str):
        """Update baseline statistics for a metric"""
        values = list(self.metric_history[metric_name])
        
        if len(values) < 2:
            return
            
        mean = statistics.mean(values)
        stdev = statistics.stdev(values)
        
        self.baselines[metric_name] = {
            "mean": mean,
            "stdev": stdev,
            "min": min(values),
            "max": max(values),
            "count": len(values)
        }
        
    def is_anomaly(self, metric_name: str, value: float) -> bool:
        """Check if a value is anomalous"""
        baseline = self.baselines.get(metric_name)
        if not baseline or baseline["stdev"] == 0:
            return False
            
        z_score = abs((value - baseline["mean"]) / baseline["stdev"])
        return z_score > self.z_threshold
    
    def _create_alert(self, metric_name: str, value: float) -> AnomalyAlert:
        """Create an anomaly alert"""
        baseline = self.baselines[metric_name]
        z_score = abs((value - baseline["mean"]) / baseline["stdev"])
        
        # Determine severity
        if z_score > 5:
            severity = "critical"
        elif z_score > 4:
            severity = "high"
        elif z_score > 3.5:
            severity = "medium"
        else:
            severity = "low"
        
        expected_range = (
            baseline["mean"] - 2 * baseline["stdev"],
            baseline["mean"] + 2 * baseline["stdev"]
        )
        
        description = (
            f"{metric_name} value {value:.2f} is {severity} anomaly "
            f"(z-score: {z_score:.2f}, expected: {expected_range[0]:.2f} - {expected_range[1]:.2f})"
        )
        
        return AnomalyAlert(
            metric_name=metric_name,
            value=value,
            expected_range=expected_range,
            severity=severity,
            timestamp=time.time(),
            z_score=z_score,
            description=description
        )
    
    def get_recent_alerts(self, hours: int = 1) -> List[AnomalyAlert]:
        """Get alerts from the last N hours"""
        cutoff = time.time() - (hours * 3600)
        return [alert for alert in self.alerts if alert.timestamp > cutoff]
    
    def get_anomaly_summary(self) -> Dict[str, Any]:
        """Get summary of anomaly detection status"""
        recent_alerts = self.get_recent_alerts(24)  # Last 24 hours
        
        severity_counts = {}
        for alert in recent_alerts:
            severity_counts[alert.severity] = severity_counts.get(alert.severity, 0) + 1
        
        return {
            "total_metrics_monitored": len(self.baselines),
            "recent_alerts_24h": len(recent_alerts),
            "severity_breakdown": severity_counts,
            "most_anomalous_metrics": self._get_most_anomalous_metrics(),
            "baseline_health": self._assess_baseline_health()
        }
    
    def _get_most_anomalous_metrics(self) -> List[str]:
        """Get metrics with the most anomalies"""
        metric_alert_counts = {}
        for alert in self.get_recent_alerts(24):
            metric_alert_counts[alert.metric_name] = metric_alert_counts.get(alert.metric_name, 0) + 1
        
        return sorted(metric_alert_counts.keys(), key=lambda k: metric_alert_counts[k], reverse=True)[:5]
    
    def _assess_baseline_health(self) -> str:
        """Assess the health of our baselines"""
        if len(self.baselines) == 0:
            return "no_data"
        
        unhealthy_count = sum(1 for baseline in self.baselines.values() if baseline["count"] < 20)
        health_ratio = 1 - (unhealthy_count / len(self.baselines))
        
        if health_ratio > 0.8:
            return "healthy"
        elif health_ratio > 0.6:
            return "fair"
        else:
            return "poor"

# Global anomaly detector instance
anomaly_detector = AnomalyDetector()
