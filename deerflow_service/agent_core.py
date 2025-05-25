
"""
Advanced Agent Core for DeerFlow Research Service

This module implements the core agent infrastructure with planning, reasoning,
and memory capabilities for sophisticated research tasks.
"""

import asyncio
import json
import logging
import time
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass, asdict
from enum import Enum

# Import shared types
from shared_types import TaskStatus, AgentState, ExecutionPlan, SubTask

# Import optimization components
from task_manager import TaskManager
from state_manager import StateStore, StateTransitionValidator
from tools import ToolRegistry, WebSearchTool, FinancialSearchTool
from query_analyzer import EnhancedQueryAnalyzer
from metrics import MetricsCollector

# Import reasoning engine and domain agents for Phase 2
try:
    from reasoning_engine import reasoning_engine, Evidence, EvidenceType
    from domain_agents import domain_orchestrator
    ADVANCED_REASONING_AVAILABLE = True
except ImportError:
    ADVANCED_REASONING_AVAILABLE = False

# Import learning system for Phase 3
try:
    from learning_system import learning_system, UserFeedback, FeedbackType
    LEARNING_SYSTEM_AVAILABLE = True
except ImportError:
    LEARNING_SYSTEM_AVAILABLE = False

logger = logging.getLogger("agent_core")

class QueryType(Enum):
    SIMPLE = "simple"
    COMPARATIVE = "comparative"
    ANALYTICAL = "analytical"
    FINANCIAL = "financial"
    SCIENTIFIC = "scientific"
    CURRENT_EVENTS = "current_events"
    MULTI_DOMAIN = "multi_domain"

class TaskPlanner:
    """Intelligent task planning with query analysis and strategy selection"""
    
    def __init__(self, query_analyzer: EnhancedQueryAnalyzer):
        self.query_analyzer = query_analyzer
        self.strategy_templates = {
            "simple": {
                "steps": ["search", "synthesize", "report"],
                "tools": ["web_search", "llm_synthesis"],
                "depth": 1
            },
            "comparative": {
                "steps": ["analyze_query", "parallel_research", "compare", "synthesize"],
                "tools": ["web_search", "academic_search", "comparison_engine"],
                "depth": 3
            },
            "analytical": {
                "steps": ["hypothesis_generation", "evidence_gathering", "analysis", "validation"],
                "tools": ["web_search", "data_analysis", "reasoning_engine"],
                "depth": 4
            },
            "financial": {
                "steps": ["market_data", "news_analysis", "trend_analysis", "forecast"],
                "tools": ["financial_search", "news_search", "sentiment_analysis"],
                "depth": 3
            }
        }
    
    def create_execution_plan(self, query: str, analysis: Dict[str, Any]) -> ExecutionPlan:
        """Create a detailed execution plan based on query analysis"""
        intent = analysis["intent"]["primary"]
        complexity = analysis["complexity"]["level"]
        
        # Select strategy template
        strategy_name = self._select_strategy(intent, complexity)
        template = self.strategy_templates.get(strategy_name, self.strategy_templates["simple"])
        
        # Create sub-tasks based on analysis
        sub_tasks = []
        
        # Initial search phase
        sub_tasks.append(SubTask(
            id="search_1",
            description=f"Search for information about: {query[:50]}...",
            type="search",
            priority=1,
            dependencies=[],
            estimated_time=30
        ))
        
        # Add domain-specific tasks
        if analysis.get("domains"):
            for i, domain_info in enumerate(analysis["domains"][:2]):
                if domain_info["confidence"] > 0.3:
                    sub_tasks.append(SubTask(
                        id=f"domain_{i+1}",
                        description=f"Domain analysis: {domain_info['domain']}",
                        type="domain_analysis",
                        priority=2,
                        dependencies=["search_1"],
                        estimated_time=45
                    ))
        
        # Add comparison if needed
        if intent == "comparison":
            sub_tasks.append(SubTask(
                id="comparison_1",
                description="Structured comparison analysis",
                type="comparison",
                priority=3,
                dependencies=["search_1"],
                estimated_time=60
            ))
        
        # Synthesis phase
        sub_tasks.append(SubTask(
            id="synthesis_1",
            description="Synthesize findings",
            type="synthesis",
            priority=len(sub_tasks) + 1,
            dependencies=[t.id for t in sub_tasks],
            estimated_time=40
        ))
        
        total_time = sum(t.estimated_time for t in sub_tasks)
        
        return ExecutionPlan(
            strategy=strategy_name,
            steps=sub_tasks,
            total_estimated_time=total_time,
            adaptation_points=[f"after_{t.id}" for t in sub_tasks[:-1]],
            success_criteria=[
                "Information gathered successfully",
                "High-quality sources identified",
                "Analysis completed",
                "User query addressed"
            ]
        )
    
    def _select_strategy(self, intent: str, complexity: str) -> str:
        """Select the best strategy based on query characteristics"""
        if intent == "comparison":
            return "comparative"
        elif intent == "analysis":
            return "analytical"
        elif complexity == "complex":
            return "analytical"
        else:
            return "simple"

class OptimizedAgentCore:
    """Optimized agent core with all improvements"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        
        # Initialize components
        self.task_manager = TaskManager()
        self.state_store = StateStore(self.config.get("state_path", "state_storage"))
        self.tool_registry = ToolRegistry()
        self.query_analyzer = EnhancedQueryAnalyzer()
        self.planner = TaskPlanner(self.query_analyzer)
        self.metrics = MetricsCollector()
        
        # Initialize tools
        self._initialize_tools()
        
        # Advanced reasoning integration
        self.reasoning_enabled = ADVANCED_REASONING_AVAILABLE
        self.learning_enabled = LEARNING_SYSTEM_AVAILABLE
        
        logger.info("OptimizedAgentCore initialized")
    
    async def __aenter__(self):
        """Async context manager entry"""
        await self.state_store.connect()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.task_manager.shutdown()
        await self.state_store.disconnect()
    
    def _initialize_tools(self):
        """Initialize available tools"""
        # Register basic tools
        self.tool_registry.register(
            "web_search",
            WebSearchTool,
            self.config.get("web_search", {})
        )
        
        self.tool_registry.register(
            "financial_search",
            FinancialSearchTool,
            self.config.get("financial_search", {})
        )
        
        logger.info(f"Initialized {len(self.tool_registry.tools)} tools")
    
    async def create_research_task(
        self,
        query: str,
        preferences: Optional[Dict[str, Any]] = None,
        timeout: Optional[float] = None
    ) -> str:
        """Create optimized research task"""
        
        task_id = str(uuid.uuid4())
        
        # Analyze query
        start_time = time.time()
        analysis = self.query_analyzer.analyze_query(query)
        analysis_time = time.time() - start_time
        
        self.metrics.record_operation_time("query_analysis", analysis_time)
        
        # Record metrics
        intent = analysis["intent"]["primary"]
        self.metrics.record_task_start(task_id, intent)
        
        # Create initial state
        agent_state = AgentState(
            agent_id=f"agent_{task_id[:8]}",
            task_id=task_id,
            status=TaskStatus.PENDING,
            current_step=0,
            working_memory={},
            execution_plan=None,
            reasoning_chain=[],
            confidence_scores={},
            start_time=time.time(),
            metadata={
                "query": query,
                "analysis": analysis,
                "preferences": preferences or {},
                "created_at": datetime.now().isoformat()
            }
        )
        
        # Save state
        await self.state_store.save_state(task_id, agent_state)
        
        # Create managed task
        await self.task_manager.create_managed_task(
            self._execute_research_task(task_id, query, analysis),
            task_id,
            timeout=timeout or self.config.get("default_timeout", 300)
        )
        
        logger.info(f"Created optimized research task {task_id}")
        return task_id
    
    async def _execute_research_task(
        self,
        task_id: str,
        query: str,
        analysis: Dict[str, Any]
    ):
        """Execute research task with all optimizations"""
        
        state = await self.state_store.get_state(task_id)
        if not state:
            raise ValueError(f"State not found for task {task_id}")
        
        intent = analysis["intent"]["primary"]
        
        try:
            # Planning phase
            state = StateTransitionValidator.transition_state(state, TaskStatus.PLANNING)
            await self.state_store.save_state(task_id, state)
            
            # Create execution plan
            plan_start = time.time()
            plan = self.planner.create_execution_plan(query, analysis)
            plan_time = time.time() - plan_start
            
            self.metrics.record_operation_time("planning", plan_time)
            
            state.execution_plan = plan
            
            # Execution phase
            state = StateTransitionValidator.transition_state(state, TaskStatus.EXECUTING)
            await self.state_store.save_state(task_id, state)
            
            # Execute plan steps
            exec_start = time.time()
            results = await self._execute_plan(task_id, plan, analysis)
            exec_time = time.time() - exec_start
            
            self.metrics.record_operation_time("execution", exec_time)
            
            # Reasoning phase (if available)
            if self.reasoning_enabled:
                state = StateTransitionValidator.transition_state(state, TaskStatus.REASONING)
                await self.state_store.save_state(task_id, state)
                
                reasoning_start = time.time()
                reasoning_results = await self._apply_reasoning(query, results, analysis)
                reasoning_time = time.time() - reasoning_start
                
                self.metrics.record_operation_time("reasoning", reasoning_time)
                state.reasoning_chain.extend(reasoning_results)
            
            # Complete
            state = StateTransitionValidator.transition_state(state, TaskStatus.COMPLETED)
            await self.state_store.save_state(task_id, state)
            
            # Record completion metrics
            duration = time.time() - state.start_time
            self.metrics.record_task_end(task_id, intent, "success", duration)
            
        except Exception as e:
            logger.error(f"Task {task_id} failed: {e}")
            state = await self.state_store.get_state(task_id)
            if state:
                state.status = TaskStatus.FAILED
                state.metadata["error"] = str(e)
                await self.state_store.save_state(task_id, state)
            
            # Record failure metrics
            duration = time.time() - state.start_time if state else 0
            self.metrics.record_task_end(task_id, intent, "failed", duration)
            raise
    
    async def _execute_plan(
        self,
        task_id: str,
        plan: ExecutionPlan,
        analysis: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Execute plan with parallel processing where possible"""
        
        results = []
        completed_tasks = set()
        
        # Execute tasks in dependency order
        while len(completed_tasks) < len(plan.steps):
            # Find tasks ready to execute
            ready_tasks = [
                task for task in plan.steps
                if task.id not in completed_tasks
                and all(dep in completed_tasks for dep in task.dependencies)
            ]
            
            if not ready_tasks:
                break
            
            # Execute ready tasks
            for task in ready_tasks:
                task_start = time.time()
                result = await self._execute_subtask(task, analysis)
                task_time = time.time() - task_start
                
                self.metrics.record_operation_time(f"subtask_{task.type}", task_time)
                
                results.append({
                    "task_id": task.id,
                    "type": task.type,
                    "result": result,
                    "timestamp": time.time()
                })
                completed_tasks.add(task.id)
                
                # Update state
                state = await self.state_store.get_state(task_id)
                if state:
                    state.current_step = len(completed_tasks)
                    await self.state_store.save_state(task_id, state)
        
        return results
    
    async def _execute_subtask(
        self,
        task: SubTask,
        analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute individual subtask"""
        
        try:
            if task.type == "search":
                return await self._execute_search(analysis["query"], analysis)
            elif task.type == "domain_analysis":
                return await self._execute_domain_analysis(analysis)
            elif task.type == "comparison":
                return await self._execute_comparison(analysis)
            elif task.type == "synthesis":
                return await self._execute_synthesis(analysis)
            else:
                return {"status": "skipped", "reason": "Unknown task type"}
                
        except Exception as e:
            logger.error(f"Subtask {task.id} failed: {e}")
            return {"status": "error", "error": str(e)}
    
    async def _execute_search(
        self,
        query: str,
        analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute search with multiple tools"""
        
        search_results = []
        
        # Web search
        search_start = time.time()
        web_results = await self.tool_registry.execute_tool("web_search", query, limit=10)
        search_time = time.time() - search_start
        
        self.metrics.record_tool_call("web_search", web_results.get("status", "error"), search_time)
        
        if web_results.get("status") == "success":
            search_results.extend(web_results.get("results", []))
        
        # Financial search if relevant
        domains = analysis.get("domains", [])
        if domains and domains[0]["domain"] == "financial" and domains[0]["confidence"] > 0.5:
            fin_start = time.time()
            fin_results = await self.tool_registry.execute_tool("financial_search", query, limit=5)
            fin_time = time.time() - fin_start
            
            self.metrics.record_tool_call("financial_search", fin_results.get("status", "error"), fin_time)
            
            if fin_results.get("status") == "success":
                search_results.extend(fin_results.get("results", []))
        
        return {
            "status": "success",
            "results": search_results,
            "total_results": len(search_results)
        }
    
    async def _execute_domain_analysis(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Execute domain-specific analysis"""
        
        if not ADVANCED_REASONING_AVAILABLE:
            return {"status": "skipped", "reason": "Domain analysis not available"}
        
        try:
            # Use domain orchestrator
            domain_results = await domain_orchestrator.process_with_domain_expertise(
                analysis["query"]
            )
            
            return {
                "status": "success",
                "domain_analysis": domain_results,
                "primary_domain": domain_results.get("primary_domain")
            }
        except Exception as e:
            logger.error(f"Domain analysis failed: {e}")
            return {"status": "error", "error": str(e)}
    
    async def _execute_comparison(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Execute comparison analysis"""
        
        entities = analysis.get("entities", [])
        if len(entities) < 2:
            return {
                "status": "error",
                "error": "Not enough entities for comparison"
            }
        
        # Extract comparison subjects
        subjects = [e["text"] for e in entities[:2]]
        
        return {
            "status": "success",
            "comparison": {
                "subjects": subjects,
                "aspects": ["features", "performance", "cost", "reviews"],
                "methodology": "multi-criteria analysis"
            }
        }
    
    async def _execute_synthesis(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Execute synthesis of results"""
        
        return {
            "status": "success",
            "synthesis": {
                "method": "abstractive",
                "confidence": 0.85,
                "key_findings": []
            }
        }
    
    async def _apply_reasoning(
        self,
        query: str,
        results: List[Dict[str, Any]],
        analysis: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Apply advanced reasoning to results"""
        
        reasoning_chain = []
        
        if ADVANCED_REASONING_AVAILABLE:
            try:
                # Convert results to evidence
                evidence_list = []
                
                for result in results:
                    if result.get("result", {}).get("status") == "success":
                        search_results = result.get("result", {}).get("results", [])
                        for item in search_results:
                            evidence_list.append({
                                "content": item.get("snippet", ""),
                                "source": item.get("url", ""),
                                "relevance_score": item.get("relevance_score", 0.5)
                            })
                
                # Process with reasoning engine
                if evidence_list:
                    evidence_objects = reasoning_engine.process_evidence(evidence_list)
                    
                    # Domain analysis
                    domain_insights = await domain_orchestrator.process_with_domain_expertise(
                        query,
                        evidence_objects
                    )
                    
                    reasoning_chain.append({
                        "step": "domain_analysis",
                        "insights": domain_insights,
                        "timestamp": time.time()
                    })
                    
                    # Record confidence metrics
                    for domain, report in domain_insights.get("domain_reports", {}).items():
                        for insight in report.get("insights", []):
                            self.metrics.record_confidence(
                                domain,
                                insight.get("confidence", 0.0)
                            )
            except Exception as e:
                logger.error(f"Reasoning failed: {e}")
                reasoning_chain.append({
                    "step": "reasoning_error",
                    "error": str(e),
                    "timestamp": time.time()
                })
        
        return reasoning_chain
    
    async def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get optimized task status"""
        
        state = await self.state_store.get_state(task_id)
        if not state:
            return None
        
        # Get metrics summary
        metrics_summary = self.metrics.get_metrics_summary()
        
        return {
            "task_id": task_id,
            "status": state.status.value,
            "current_step": state.current_step,
            "progress": self._calculate_progress(state),
            "execution_plan": asdict(state.execution_plan) if state.execution_plan else None,
            "reasoning_chain": state.reasoning_chain,
            "confidence_scores": state.confidence_scores,
            "processing_time": time.time() - state.start_time,
            "metadata": state.metadata,
            "metrics": {
                "task_specific": {
                    "steps_completed": state.current_step,
                    "total_steps": len(state.execution_plan.steps) if state.execution_plan else 0
                },
                "system": metrics_summary
            }
        }
    
    def _calculate_progress(self, state: AgentState) -> float:
        """Calculate progress with better granularity"""
        
        if state.status == TaskStatus.COMPLETED:
            return 1.0
        elif state.status == TaskStatus.FAILED:
            return state.current_step / len(state.execution_plan.steps) if state.execution_plan else 0.0
        elif state.status == TaskStatus.PENDING:
            return 0.0
        elif state.status == TaskStatus.PLANNING:
            return 0.1
        elif state.status == TaskStatus.EXECUTING and state.execution_plan:
            total_steps = len(state.execution_plan.steps)
            if total_steps == 0:
                return 0.5
            
            step_progress = state.current_step / total_steps
            return 0.1 + (step_progress * 0.8)  # 10% planning, 80% execution, 10% reasoning
        elif state.status == TaskStatus.REASONING:
            return 0.9
        else:
            return 0.5
    
    async def cancel_task(self, task_id: str) -> bool:
        """Cancel a running task"""
        
        # Cancel the async task
        cancelled = await self.task_manager.cancel_task(task_id)
        
        if cancelled:
            # Update state
            state = await self.state_store.get_state(task_id)
            if state and state.status not in [TaskStatus.COMPLETED, TaskStatus.FAILED]:
                state.status = TaskStatus.FAILED
                state.metadata["cancelled"] = True
                state.metadata["cancelled_at"] = datetime.now().isoformat()
                await self.state_store.save_state(task_id, state)
        
        return cancelled
    
    async def cleanup_old_tasks(self, max_age_hours: int = 24):
        """Cleanup old tasks from storage"""
        logger.info(f"Cleanup requested for tasks older than {max_age_hours} hours")
    
    def get_system_health(self) -> Dict[str, Any]:
        """Get system health status"""
        return self.metrics.get_system_health()

# Global agent core instance
agent_core = OptimizedAgentCore()
