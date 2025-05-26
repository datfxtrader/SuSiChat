"""
Learning and Optimization System for Advanced Agent Research

This module implements machine learning capabilities that allow the agent system
to improve over time through strategy optimization, performance tracking, and
user feedback integration.
"""

import asyncio
import json
import logging
import time
import statistics
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
from collections import defaultdict, deque
from functools import lru_cache
import math

logger = logging.getLogger("learning_system")

class LearningError(Exception):
    """Base exception for learning system errors"""
    pass

class StrategyNotFoundError(LearningError):
    """Raised when strategy is not found"""
    pass

def safe_operation(default_return=None):
    """Decorator for safe operation execution"""
    def decorator(func):
        if asyncio.iscoroutinefunction(func):
            async def async_wrapper(*args, **kwargs):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    logger.error(f"Error in {func.__name__}: {e}")
                    return default_return
            return async_wrapper
        else:
            def sync_wrapper(*args, **kwargs):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    logger.error(f"Error in {func.__name__}: {e}")
                    return default_return
            return sync_wrapper
    return decorator

class LearningMode(Enum):
    EXPLORATION = "exploration"  # Try new strategies
    EXPLOITATION = "exploitation"  # Use best known strategies
    BALANCED = "balanced"  # Mix of both

class FeedbackType(Enum):
    ACCURACY = "accuracy"
    RELEVANCE = "relevance"
    COMPLETENESS = "completeness"
    TIMELINESS = "timeliness"
    OVERALL = "overall"

@dataclass
class LearningConfig:
    """Configuration for learning system"""
    # Strategy optimization
    strategy_performance_window: int = 100
    learning_rate: float = 0.1
    exploration_rate: float = 0.2
    strategy_cache_ttl: int = 300
    
    # Feedback processing
    feedback_window_size: int = 50
    quality_trend_window: int = 20
    min_feedback_for_insights: int = 5
    
    # Performance monitoring
    metrics_retention_hours: int = 24
    metrics_window_size: int = 200
    operation_history_size: int = 100
    
    # System behavior
    enable_auto_optimization: bool = True
    enable_real_time_adjustments: bool = True
    confidence_threshold: float = 0.7

@dataclass
class PerformanceMetric:
    """Represents a performance measurement"""
    metric_type: str
    value: float
    timestamp: float
    task_id: str
    context: Dict[str, Any]

@dataclass
class UserFeedback:
    """Represents user feedback on research quality"""
    task_id: str
    feedback_type: FeedbackType
    rating: float  # 1-5 scale
    comments: Optional[str]
    improvement_suggestions: List[str]
    timestamp: float

@dataclass
class StrategyPerformance:
    """Tracks performance of different research strategies"""
    strategy_name: str
    success_count: int
    total_attempts: int
    average_rating: float
    average_processing_time: float
    domain_effectiveness: Dict[str, float]
    last_updated: float

class StrategyOptimizer:
    """Optimizes research strategies based on performance data"""
    
    def __init__(self):
        self.strategy_history: Dict[str, StrategyPerformance] = {}
        self.performance_window = 100  # Keep last 100 results per strategy
        self.learning_rate = 0.1
        self.exploration_rate = 0.2
        
        # Performance optimizations
        self._strategy_cache = {}
        self._cache_ttl = 300  # 5 minutes
        self._last_cache_clear = time.time()
        
    def record_strategy_performance(
        self, 
        strategy_name: str, 
        success: bool, 
        rating: float,
        processing_time: float,
        domain: str
    ):
        """Record the performance of a strategy"""
        
        if strategy_name not in self.strategy_history:
            self.strategy_history[strategy_name] = StrategyPerformance(
                strategy_name=strategy_name,
                success_count=0,
                total_attempts=0,
                average_rating=0.0,
                average_processing_time=0.0,
                domain_effectiveness={},
                last_updated=time.time()
            )
        
        perf = self.strategy_history[strategy_name]
        
        # Update success tracking
        if success:
            perf.success_count += 1
        perf.total_attempts += 1
        
        # Update average rating using exponential moving average
        if perf.average_rating == 0.0:
            perf.average_rating = rating
        else:
            perf.average_rating = (1 - self.learning_rate) * perf.average_rating + self.learning_rate * rating
        
        # Update average processing time
        if perf.average_processing_time == 0.0:
            perf.average_processing_time = processing_time
        else:
            perf.average_processing_time = (1 - self.learning_rate) * perf.average_processing_time + self.learning_rate * processing_time
        
        # Update domain effectiveness
        if domain not in perf.domain_effectiveness:
            perf.domain_effectiveness[domain] = rating
        else:
            perf.domain_effectiveness[domain] = (1 - self.learning_rate) * perf.domain_effectiveness[domain] + self.learning_rate * rating
        
        perf.last_updated = time.time()
        
        logger.info(f"Strategy {strategy_name} performance updated: {perf.success_count}/{perf.total_attempts} success rate")
    
    def select_optimal_strategy(self, domain: str, query_complexity: str) -> Tuple[str, float]:
        """Select the best strategy based on learned performance"""
        
        if not self.strategy_history:
            # No learning data yet, use default
            return "analytical", 0.5
        
        strategy_scores = {}
        
        for strategy_name, perf in self.strategy_history.items():
            if perf.total_attempts == 0:
                continue
            
            # Base score from success rate
            success_rate = perf.success_count / perf.total_attempts
            
            # Adjust for domain effectiveness
            domain_score = perf.domain_effectiveness.get(domain, success_rate)
            
            # Adjust for average rating
            rating_score = perf.average_rating / 5.0  # Normalize to 0-1
            
            # Combine scores
            strategy_scores[strategy_name] = (success_rate * 0.4 + domain_score * 0.4 + rating_score * 0.2)
        
        if not strategy_scores:
            return "analytical", 0.5
        
        # Epsilon-greedy strategy selection for exploration vs exploitation
        if len(strategy_scores) > 1 and time.time() % 100 < (self.exploration_rate * 100):
            # Exploration: try a random strategy
            import random
            strategy_name = random.choice(list(strategy_scores.keys()))
            confidence = strategy_scores[strategy_name]
            logger.info(f"Exploration mode: selected strategy {strategy_name}")
        else:
            # Exploitation: use best strategy
            strategy_name = max(strategy_scores, key=strategy_scores.get)
            confidence = strategy_scores[strategy_name]
            logger.info(f"Exploitation mode: selected best strategy {strategy_name}")
        
        return strategy_name, confidence
    
    @lru_cache(maxsize=128)
    def _calculate_strategy_score(self, strategy_name: str, domain: str, timestamp: float) -> float:
        """Cached strategy score calculation with timestamp for cache busting"""
        perf = self.strategy_history.get(strategy_name)
        if not perf or perf.total_attempts == 0:
            return 0.0
            
        success_rate = perf.success_count / perf.total_attempts
        domain_score = perf.domain_effectiveness.get(domain, success_rate)
        rating_score = perf.average_rating / 5.0
        
        # Apply time decay
        decay_factor = self._apply_time_decay(perf)
        
        return (success_rate * 0.4 + domain_score * 0.4 + rating_score * 0.2) * decay_factor
    
    def _apply_time_decay(self, perf: StrategyPerformance) -> float:
        """Apply time decay to old strategies"""
        time_since_update = time.time() - perf.last_updated
        days_old = time_since_update / 86400
        
        # Exponential decay: lose 50% confidence after 30 days
        decay_factor = 0.5 ** (days_old / 30)
        return max(decay_factor, 0.1)  # Minimum 10% confidence
    
    def _clear_cache_if_needed(self):
        """Clear cache periodically"""
        if time.time() - self._last_cache_clear > self._cache_ttl:
            self._calculate_strategy_score.cache_clear()
            self._last_cache_clear = time.time()
    
    def get_strategy_insights(self) -> Dict[str, Any]:
        """Get insights about strategy performance"""
        insights = {
            "total_strategies": len(self.strategy_history),
            "strategy_rankings": [],
            "domain_preferences": defaultdict(str),
            "performance_trends": {}
        }
        
        # Rank strategies by overall performance
        for strategy_name, perf in self.strategy_history.items():
            if perf.total_attempts > 0:
                overall_score = (perf.success_count / perf.total_attempts) * perf.average_rating
                insights["strategy_rankings"].append({
                    "strategy": strategy_name,
                    "score": overall_score,
                    "success_rate": perf.success_count / perf.total_attempts,
                    "avg_rating": perf.average_rating,
                    "attempts": perf.total_attempts
                })
        
        insights["strategy_rankings"].sort(key=lambda x: x["score"], reverse=True)
        
        # Find best strategy for each domain
        for strategy_name, perf in self.strategy_history.items():
            for domain, effectiveness in perf.domain_effectiveness.items():
                current_best = insights["domain_preferences"].get(domain, ("", 0.0))
                if effectiveness > current_best[1]:
                    insights["domain_preferences"][domain] = (strategy_name, effectiveness)
        
        return insights

class FeedbackProcessor:
    """Processes and learns from user feedback"""
    
    def __init__(self):
        self.feedback_history = deque(maxlen=50)  # Automatically maintains size
        self.feedback_window = 50  # Keep last 50 feedback items
        self.quality_trends: Dict[str, deque] = defaultdict(lambda: deque(maxlen=20))
        
    def process_feedback(self, feedback: UserFeedback) -> Dict[str, Any]:
        """Process user feedback and extract learning insights"""
        
        self.feedback_history.append(feedback)
        
        # Update quality trends
        self.quality_trends[feedback.feedback_type.value].append(feedback.rating)
        
        # Extract actionable insights
        insights = self._extract_feedback_insights(feedback)
        
        logger.info(f"Processed feedback for task {feedback.task_id}: {feedback.rating}/5 ({feedback.feedback_type.value})")
        
        return insights
    
    def _extract_feedback_insights(self, feedback: UserFeedback) -> Dict[str, Any]:
        """Extract actionable insights from feedback"""
        insights = {
            "immediate_actions": [],
            "long_term_improvements": [],
            "quality_assessment": {},
            "user_preferences": {}
        }
        
        # Immediate actions based on rating
        if feedback.rating < 3.0:
            insights["immediate_actions"].append(f"Low {feedback.feedback_type.value} score requires attention")
            
            if feedback.feedback_type == FeedbackType.ACCURACY:
                insights["immediate_actions"].append("Improve fact-checking and source verification")
            elif feedback.feedback_type == FeedbackType.RELEVANCE:
                insights["immediate_actions"].append("Better query understanding and filtering needed")
            elif feedback.feedback_type == FeedbackType.COMPLETENESS:
                insights["immediate_actions"].append("Expand search scope and add more sources")
            elif feedback.feedback_type == FeedbackType.TIMELINESS:
                insights["immediate_actions"].append("Optimize processing speed and real-time data access")
        
        # Long-term improvements from suggestions
        if feedback.improvement_suggestions:
            insights["long_term_improvements"].extend(feedback.improvement_suggestions)
        
        # Quality assessment
        recent_ratings = list(self.quality_trends[feedback.feedback_type.value])
        if len(recent_ratings) >= 5:
            insights["quality_assessment"] = {
                "trend": "improving" if recent_ratings[-1] > recent_ratings[0] else "declining",
                "average": statistics.mean(recent_ratings),
                "consistency": 1.0 - (statistics.stdev(recent_ratings) / 5.0) if len(recent_ratings) > 1 else 1.0
            }
        
        return insights
    
    def get_feedback_summary(self) -> Dict[str, Any]:
        """Get comprehensive feedback summary"""
        if not self.feedback_history:
            return {"message": "No feedback data available"}
        
        summary = {
            "total_feedback": len(self.feedback_history),
            "average_ratings": {},
            "improvement_areas": [],
            "satisfaction_trend": "stable",
            "common_suggestions": []
        }
        
        # Calculate average ratings by type
        feedback_by_type = defaultdict(list)
        for feedback in self.feedback_history:
            feedback_by_type[feedback.feedback_type.value].append(feedback.rating)
        
        for feedback_type, ratings in feedback_by_type.items():
            summary["average_ratings"][feedback_type] = statistics.mean(ratings)
        
        # Identify improvement areas (ratings below 3.5)
        for feedback_type, avg_rating in summary["average_ratings"].items():
            if avg_rating < 3.5:
                summary["improvement_areas"].append(feedback_type)
        
        # Analyze satisfaction trend
        if len(self.feedback_history) >= 10:
            recent_ratings = [f.rating for f in self.feedback_history[-10:]]
            older_ratings = [f.rating for f in self.feedback_history[-20:-10]] if len(self.feedback_history) >= 20 else []
            
            if older_ratings:
                recent_avg = statistics.mean(recent_ratings)
                older_avg = statistics.mean(older_ratings)
                
                if recent_avg > older_avg + 0.2:
                    summary["satisfaction_trend"] = "improving"
                elif recent_avg < older_avg - 0.2:
                    summary["satisfaction_trend"] = "declining"
        
        # Extract common suggestions
        all_suggestions = []
        for feedback in self.feedback_history:
            all_suggestions.extend(feedback.improvement_suggestions)
        
        # Simple frequency counting for common suggestions
        suggestion_counts = defaultdict(int)
        for suggestion in all_suggestions:
            suggestion_counts[suggestion.lower()] += 1
        
        summary["common_suggestions"] = [
            {"suggestion": suggestion, "frequency": count}
            for suggestion, count in sorted(suggestion_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        ]
        
        return summary

class PerformanceMonitor:
    """Monitors and tracks system performance metrics"""
    
    def __init__(self):
        self.metrics_history: List[PerformanceMetric] = []
        self.metrics_window = 200  # Keep last 200 metrics
        self.baseline_metrics: Dict[str, float] = {}
        
    def record_metric(
        self, 
        metric_type: str, 
        value: float, 
        task_id: str, 
        context: Optional[Dict[str, Any]] = None
    ):
        """Record a performance metric"""
        
        metric = PerformanceMetric(
            metric_type=metric_type,
            value=value,
            timestamp=time.time(),
            task_id=task_id,
            context=context or {}
        )
        
        self.metrics_history.append(metric)
        
        # Maintain window size
        if len(self.metrics_history) > self.metrics_window:
            self.metrics_history.pop(0)
        
        # Update baseline if this is a new metric type
        if metric_type not in self.baseline_metrics:
            self.baseline_metrics[metric_type] = value
        
        logger.debug(f"Recorded metric {metric_type}: {value} for task {task_id}")
    
    def get_performance_insights(self) -> Dict[str, Any]:
        """Get comprehensive performance insights"""
        
        if not self.metrics_history:
            return {"message": "No performance data available"}
        
        insights = {
            "overall_health": "good",
            "metric_trends": {},
            "performance_alerts": [],
            "optimization_opportunities": []
        }
        
        # Group metrics by type
        metrics_by_type = defaultdict(list)
        for metric in self.metrics_history:
            metrics_by_type[metric.metric_type].append(metric.value)
        
        # Analyze trends for each metric type
        for metric_type, values in metrics_by_type.items():
            if len(values) >= 5:
                recent_avg = statistics.mean(values[-10:])
                baseline = self.baseline_metrics.get(metric_type, recent_avg)
                
                trend_data = {
                    "current_average": recent_avg,
                    "baseline": baseline,
                    "change_percent": ((recent_avg - baseline) / baseline) * 100 if baseline > 0 else 0,
                    "trend": "improving" if recent_avg > baseline else "declining"
                }
                
                insights["metric_trends"][metric_type] = trend_data
                
                # Generate alerts for significant changes
                if abs(trend_data["change_percent"]) > 20:
                    insights["performance_alerts"].append({
                        "metric": metric_type,
                        "change": f"{trend_data['change_percent']:.1f}%",
                        "severity": "high" if abs(trend_data["change_percent"]) > 50 else "medium"
                    })
        
        # Determine overall health
        alert_count = len(insights["performance_alerts"])
        if alert_count == 0:
            insights["overall_health"] = "excellent"
        elif alert_count <= 2:
            insights["overall_health"] = "good"
        elif alert_count <= 4:
            insights["overall_health"] = "fair"
        else:
            insights["overall_health"] = "poor"
        
        return insights
    
    def suggest_optimizations(self) -> List[str]:
        """Suggest performance optimizations based on metrics"""
        suggestions = []
        
        insights = self.get_performance_insights()
        
        for alert in insights.get("performance_alerts", []):
            metric = alert["metric"]
            
            if "processing_time" in metric.lower():
                suggestions.append("Consider caching frequently requested research topics")
                suggestions.append("Optimize search query batching for better performance")
            elif "accuracy" in metric.lower():
                suggestions.append("Improve source quality filtering")
                suggestions.append("Add more fact-checking steps to the pipeline")
            elif "memory" in metric.lower():
                suggestions.append("Implement more aggressive cleanup of old research data")
        
        return list(set(suggestions))  # Remove duplicates

class AdaptiveLearningSystem:
    """Main learning system that coordinates all learning components"""
    
    def __init__(self, config: Optional[LearningConfig] = None):
        self.config = config or LearningConfig()
        self.strategy_optimizer = StrategyOptimizer()
        self.feedback_processor = FeedbackProcessor()
        self.performance_monitor = PerformanceMonitor()
        self.learning_mode = LearningMode.BALANCED
        
        logger.info("AdaptiveLearningSystem initialized with configuration")
    
    async def process_task_completion(
        self, 
        task_id: str, 
        strategy_used: str, 
        domain: str,
        success: bool,
        processing_time: float,
        user_feedback: Optional[UserFeedback] = None
    ) -> Dict[str, Any]:
        """Process a completed task for learning"""
        
        learning_results = {
            "strategy_insights": {},
            "feedback_insights": {},
            "performance_updates": {},
            "recommendations": []
        }
        
        # Default rating if no feedback provided
        rating = user_feedback.rating if user_feedback else (4.0 if success else 2.0)
        
        # Update strategy optimizer
        self.strategy_optimizer.record_strategy_performance(
            strategy_name=strategy_used,
            success=success,
            rating=rating,
            processing_time=processing_time,
            domain=domain
        )
        
        learning_results["strategy_insights"] = self.strategy_optimizer.get_strategy_insights()
        
        # Process user feedback if provided
        if user_feedback:
            feedback_insights = self.feedback_processor.process_feedback(user_feedback)
            learning_results["feedback_insights"] = feedback_insights
        
        # Record performance metrics
        self.performance_monitor.record_metric("processing_time", processing_time, task_id, {"domain": domain})
        self.performance_monitor.record_metric("success_rate", 1.0 if success else 0.0, task_id, {"strategy": strategy_used})
        
        learning_results["performance_updates"] = self.performance_monitor.get_performance_insights()
        
        # Generate recommendations
        learning_results["recommendations"] = self._generate_learning_recommendations(learning_results)
        
        logger.info(f"Learning processing completed for task {task_id}")
        
        return learning_results
    
    async def process_task_completion_batch(
        self, 
        tasks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Process multiple tasks concurrently"""
        import asyncio
        
        results = await asyncio.gather(*[
            self.process_task_completion(**task) 
            for task in tasks
        ], return_exceptions=True)
        
        valid_results = []
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Batch processing error: {result}")
            else:
                valid_results.append(result)
        
        return valid_results
    
    def _generate_learning_recommendations(self, learning_results: Dict[str, Any]) -> List[str]:
        """Generate actionable recommendations based on learning results"""
        recommendations = []
        
        # Strategy recommendations
        strategy_insights = learning_results.get("strategy_insights", {})
        if strategy_insights.get("strategy_rankings"):
            best_strategy = strategy_insights["strategy_rankings"][0]
            if best_strategy["success_rate"] < 0.7:
                recommendations.append("Consider developing new research strategies for better success rates")
        
        # Feedback recommendations
        feedback_insights = learning_results.get("feedback_insights", {})
        if feedback_insights.get("immediate_actions"):
            recommendations.extend(feedback_insights["immediate_actions"][:2])  # Top 2 actions
        
        # Performance recommendations
        recommendations.extend(self.performance_monitor.suggest_optimizations())
        
        return recommendations[:5]  # Limit to top 5 recommendations
    
    def get_learning_summary(self) -> Dict[str, Any]:
        """Get comprehensive learning system summary"""
        return {
            "strategy_performance": self.strategy_optimizer.get_strategy_insights(),
            "feedback_summary": self.feedback_processor.get_feedback_summary(),
            "performance_insights": self.performance_monitor.get_performance_insights(),
            "learning_mode": self.learning_mode.value,
            "system_health": self._assess_system_health()
        }
    
    def _assess_system_health(self) -> Dict[str, Any]:
        """Assess overall system learning health"""
        strategy_count = len(self.strategy_optimizer.strategy_history)
        feedback_count = len(self.feedback_processor.feedback_history)
        metrics_count = len(self.performance_monitor.metrics_history)
        
        health_score = min(1.0, (strategy_count + feedback_count + metrics_count) / 100)
        
        return {
            "health_score": health_score,
            "data_richness": "rich" if health_score > 0.7 else "moderate" if health_score > 0.3 else "limited",
            "learning_capability": "advanced" if feedback_count > 20 else "basic",
            "recommendation": "System learning well" if health_score > 0.6 else "Needs more data for better learning"
        }

# Global learning system instance
learning_system = AdaptiveLearningSystem()