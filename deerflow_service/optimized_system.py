
import asyncio
import uuid
import time
import logging
from typing import Dict, Any, Optional
from enhanced_tools import (
    DependencyContainer, EnhancedToolRegistry, CacheManager,
    WebSearchTool, FinancialDataTool, CodeExecutionTool
)
from enhanced_memory import PersistentMemoryManager
from enhanced_agents import EnhancedMultiAgentOrchestrator

logger = logging.getLogger("optimized_system")

class OptimizedDeerFlowAgentSystem:
    """Complete optimized DeerFlow agent system"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        
        # Initialize dependency container
        self.container = DependencyContainer()
        self._register_dependencies()
        
        # Resolve core services
        self.tool_registry = self.container.resolve(EnhancedToolRegistry)
        self.memory_manager = self.container.resolve(PersistentMemoryManager)
        self.orchestrator = self.container.resolve(EnhancedMultiAgentOrchestrator)
        
        # Metrics and monitoring
        self.metrics = {
            "total_tasks": 0,
            "successful_tasks": 0,
            "failed_tasks": 0,
            "average_execution_time": 0.0,
            "start_time": time.time()
        }
        
        self.initialized = False
        
        logger.info("Optimized DeerFlow Agent System initialized")
    
    def _register_dependencies(self):
        """Register all dependencies"""
        
        # Configuration
        self.container.register(Dict, self.config)
        
        # Cache manager
        cache_manager = CacheManager(self.config.get("cache", {}))
        self.container.register(CacheManager, cache_manager)
        
        # Memory manager
        memory_manager = PersistentMemoryManager(self.config.get("memory", {}))
        self.container.register(PersistentMemoryManager, memory_manager)
        
        # Tool registry
        tool_registry = EnhancedToolRegistry(self.container)
        self.container.register(EnhancedToolRegistry, tool_registry)
        
        # Multi-agent orchestrator
        orchestrator = EnhancedMultiAgentOrchestrator(
            tool_registry,
            memory_manager,
            self.config.get("orchestrator", {})
        )
        self.container.register(EnhancedMultiAgentOrchestrator, orchestrator)
    
    async def initialize(self):
        """Initialize all services"""
        if self.initialized:
            return
        
        try:
            # Initialize memory manager
            await self.memory_manager.initialize()
            
            # Register tools
            await self._register_tools()
            
            self.initialized = True
            logger.info("All services initialized successfully")
            
        except Exception as e:
            logger.error(f"Initialization failed: {e}")
            raise
    
    async def _register_tools(self):
        """Register all available tools"""
        
        # Web search tool
        self.tool_registry.register(
            WebSearchTool,
            providers=self.config.get("search_providers", {
                "default": {
                    "url": "https://api.search.brave.com/res/v1/web/search",
                    "parser": "brave"
                }
            })
        )
        
        # Financial data tool
        self.tool_registry.register(
            FinancialDataTool,
            data_sources=self.config.get("financial_sources", {}),
            cache_manager=self.container.resolve(CacheManager)
        )
        
        # Code execution tool
        self.tool_registry.register(
            CodeExecutionTool,
            sandbox_config=self.config.get("sandbox", {
                "allowed_modules": ["math", "statistics", "json"],
                "timeout": 30
            })
        )
        
        logger.info(f"Registered {len(self.tool_registry.tools)} tools")
    
    async def process_research_request(
        self,
        query: str,
        user_id: str,
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Process research request with full optimization"""
        
        if not self.initialized:
            await self.initialize()
        
        start_time = time.time()
        task_id = str(uuid.uuid4())
        
        self.metrics["total_tasks"] += 1
        
        try:
            # Analyze complexity
            complexity = self._analyze_complexity(query)
            
            # Create optimized agent team
            team = await self.orchestrator.create_agent_team(query, complexity)
            
            # Execute with coordination
            result = await self.orchestrator.execute_coordinated_task(query, team)
            
            execution_time = time.time() - start_time
            
            # Store in memory for learning
            await self._store_execution_history(
                task_id,
                query,
                result,
                execution_time
            )
            
            # Update metrics
            self.metrics["successful_tasks"] += 1
            self._update_average_execution_time(execution_time)
            
            return {
                "task_id": task_id,
                "status": "success",
                "query": query,
                "result": result,
                "execution_time": execution_time,
                "team_size": len(team),
                "complexity": complexity,
                "metrics": await self._get_task_metrics(task_id)
            }
            
        except Exception as e:
            self.metrics["failed_tasks"] += 1
            logger.error(f"Research request failed: {e}")
            
            return {
                "task_id": task_id,
                "status": "error",
                "error": str(e),
                "execution_time": time.time() - start_time,
                "query": query
            }
    
    def _analyze_complexity(self, query: str) -> str:
        """Analyze query complexity"""
        
        # Simple complexity analysis
        word_count = len(query.split())
        question_marks = query.count("?")
        complex_words = ["analyze", "compare", "evaluate", "comprehensive", "detailed"]
        
        complexity_score = 0
        
        # Word count factor
        if word_count < 5:
            complexity_score += 1
        elif word_count < 15:
            complexity_score += 2
        else:
            complexity_score += 3
        
        # Question complexity
        if question_marks > 0:
            complexity_score += 1
        
        # Complex word detection
        complex_word_count = sum(1 for word in complex_words if word in query.lower())
        complexity_score += complex_word_count
        
        # Determine complexity level
        if complexity_score <= 2:
            return "low"
        elif complexity_score <= 4:
            return "medium"
        else:
            return "high"
            complexity_score += 2
        else:
            complexity_score += 3
        
        # Question complexity
        complexity_score += question_marks
        
        # Complex keywords
        for word in complex_words:
            if word in query.lower():
                complexity_score += 1
        
        if complexity_score <= 2:
            return "simple"
        elif complexity_score <= 5:
            return "moderate"
        else:
            return "complex"
    
    def _update_average_execution_time(self, execution_time: float):
        """Update average execution time"""
        current_avg = self.metrics["average_execution_time"]
        total_successful = self.metrics["successful_tasks"]
        
        if total_successful == 1:
            self.metrics["average_execution_time"] = execution_time
        else:
            # Rolling average
            self.metrics["average_execution_time"] = (
                (current_avg * (total_successful - 1) + execution_time) / total_successful
            )
    
    async def _store_execution_history(
        self,
        task_id: str,
        query: str,
        result: Dict[str, Any],
        execution_time: float
    ):
        """Store execution history for learning"""
        
        try:
            await self.memory_manager.store_memory(
                agent_id="system",
                memory_type="procedural",
                content=f"Executed task: {query}",
                metadata={
                    "task_id": task_id,
                    "query": query,
                    "result_summary": str(result)[:500],
                    "execution_time": execution_time,
                    "success": result.get("status") == "success"
                },
                importance=0.8
            )
        except Exception as e:
            logger.warning(f"Failed to store execution history: {e}")
    
    async def _get_task_metrics(self, task_id: str) -> Dict[str, Any]:
        """Get detailed metrics for a task"""
        
        try:
            tool_metrics = self.tool_registry.get_all_metrics()
            memory_stats = await self.memory_manager.get_memory_stats("system")
            orchestrator_stats = self.orchestrator.get_orchestrator_stats()
            
            return {
                "tool_metrics": tool_metrics,
                "memory_stats": memory_stats,
                "orchestrator_stats": orchestrator_stats,
                "system_metrics": self.metrics
            }
        except Exception as e:
            logger.warning(f"Failed to get task metrics: {e}")
            return {"error": str(e)}
    
    async def get_system_health(self) -> Dict[str, Any]:
        """Get comprehensive system health status"""
        
        try:
            uptime = time.time() - self.metrics["start_time"]
            total_tasks = self.metrics["total_tasks"]
            success_rate = (
                self.metrics["successful_tasks"] / total_tasks 
                if total_tasks > 0 else 0.0
            )
            
            # Tool health
            tool_metrics = self.tool_registry.get_all_metrics()
            tool_health = "healthy"
            
            for tool_name, metrics in tool_metrics.items():
                if metrics["success_rate"] < 0.8:
                    tool_health = "degraded"
                    break
            
            # Memory health
            memory_stats = await self.memory_manager.get_memory_stats("system")
            
            # Agent health
            orchestrator_stats = self.orchestrator.get_orchestrator_stats()
            
            # Overall health determination
            overall_health = "healthy"
            if success_rate < 0.7:
                overall_health = "degraded"
            elif success_rate < 0.5:
                overall_health = "critical"
            
            return {
                "overall_health": overall_health,
                "uptime_seconds": uptime,
                "success_rate": success_rate,
                "total_tasks": total_tasks,
                "successful_tasks": self.metrics["successful_tasks"],
                "failed_tasks": self.metrics["failed_tasks"],
                "average_execution_time": self.metrics["average_execution_time"],
                "tool_health": tool_health,
                "tool_count": len(self.tool_registry.tools),
                "agent_count": orchestrator_stats["total_agents"],
                "memory_stats": memory_stats,
                "initialized": self.initialized
            }
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                "overall_health": "critical",
                "error": str(e),
                "timestamp": time.time()
            }
    
    async def get_detailed_metrics(self) -> Dict[str, Any]:
        """Get detailed system metrics"""
        
        try:
            return {
                "system_metrics": self.metrics,
                "tool_metrics": self.tool_registry.get_all_metrics(),
                "memory_stats": await self.memory_manager.get_memory_stats("system"),
                "orchestrator_stats": self.orchestrator.get_orchestrator_stats(),
                "health": await self.get_system_health()
            }
        except Exception as e:
            logger.error(f"Failed to get detailed metrics: {e}")
            return {"error": str(e)}
    
    async def shutdown(self):
        """Gracefully shutdown the system"""
        
        logger.info("Shutting down DeerFlow Agent System")
        
        try:
            # Store final metrics
            final_metrics = await self.get_detailed_metrics()
            
            # Clear agent memories if needed
            for agent_id in self.orchestrator.agents.keys():
                await self.memory_manager.clear_agent_memories(agent_id)
            
            logger.info("Shutdown complete")
            
        except Exception as e:
            logger.error(f"Error during shutdown: {e}")
    
    def reset_metrics(self):
        """Reset system metrics"""
        self.metrics = {
            "total_tasks": 0,
            "successful_tasks": 0,
            "failed_tasks": 0,
            "average_execution_time": 0.0,
            "start_time": time.time()
        }
        logger.info("System metrics reset")

# Global optimized instance
def create_optimized_system(config: Optional[Dict[str, Any]] = None) -> OptimizedDeerFlowAgentSystem:
    """Create an optimized DeerFlow system with default configuration"""
    
    default_config = {
        "cache": {
            "ttl": 300
        },
        "memory": {
            "redis_url": "redis://localhost:6379",
            "postgres_url": "postgresql://localhost:5432/deerflow"
        },
        "orchestrator": {
            "task_timeout": 300
        },
        "search_providers": {
            "default": {
                "url": "https://api.search.brave.com/res/v1/web/search",
                "parser": "brave"
            }
        },
        "financial_sources": {},
        "sandbox": {
            "allowed_modules": ["math", "statistics", "json", "datetime"],
            "timeout": 30
        }
    }
    
    if config:
        default_config.update(config)
    
    return OptimizedDeerFlowAgentSystem(default_config)

# Convenience function for quick testing
async def test_optimized_system():
    """Test the optimized system"""
    
    system = create_optimized_system()
    
    try:
        await system.initialize()
        
        # Test research request
        result = await system.process_research_request(
            query="Research the latest trends in artificial intelligence",
            user_id="test_user"
        )
        
        print("Test Result:", result)
        
        # Get system health
        health = await system.get_system_health()
        print("System Health:", health)
        
        return result
        
    except Exception as e:
        print(f"Test failed: {e}")
        return None
    finally:
        await system.shutdown()

if __name__ == "__main__":
    asyncio.run(test_optimized_system())
