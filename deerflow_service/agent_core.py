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

logger = logging.getLogger("agent_core")

class TaskStatus(Enum):
    PENDING = "pending"
    PLANNING = "planning"
    EXECUTING = "executing"
    REASONING = "reasoning"
    COMPLETED = "completed"
    FAILED = "failed"

class QueryType(Enum):
    SIMPLE = "simple"
    COMPARATIVE = "comparative"
    ANALYTICAL = "analytical"
    FINANCIAL = "financial"
    SCIENTIFIC = "scientific"
    CURRENT_EVENTS = "current_events"
    MULTI_DOMAIN = "multi_domain"

@dataclass
class SubTask:
    """Represents a decomposed sub-task within a research plan"""
    id: str
    description: str
    type: str
    priority: int
    dependencies: List[str]
    estimated_time: int
    status: str = "pending"
    result: Optional[Dict[str, Any]] = None

@dataclass
class ExecutionPlan:
    """Represents the complete execution plan for a research task"""
    strategy: str
    steps: List[SubTask]
    total_estimated_time: int
    adaptation_points: List[str]
    success_criteria: List[str]

@dataclass
class AgentState:
    """Maintains the current state of the agent"""
    agent_id: str
    task_id: str
    status: TaskStatus
    current_step: int
    working_memory: Dict[str, Any]
    execution_plan: Optional[ExecutionPlan]
    reasoning_chain: List[Dict[str, Any]]
    confidence_scores: Dict[str, float]
    start_time: float
    metadata: Dict[str, Any]

class TaskPlanner:
    """Intelligent task planning with query analysis and strategy selection"""
    
    def __init__(self):
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
                "tools": ["financial_apis", "news_search", "sentiment_analysis"],
                "depth": 3
            }
        }
    
    def analyze_query(self, query: str) -> Dict[str, Any]:
        """Analyze the query to determine type, complexity, and requirements"""
        query_lower = query.lower()
        
        # Determine query type
        query_type = QueryType.SIMPLE
        if any(word in query_lower for word in ["compare", "versus", "vs", "difference", "better"]):
            query_type = QueryType.COMPARATIVE
        elif any(word in query_lower for word in ["analyze", "analysis", "evaluate", "assess"]):
            query_type = QueryType.ANALYTICAL
        elif any(word in query_lower for word in ["price", "market", "trading", "stock", "currency", "forex"]):
            query_type = QueryType.FINANCIAL
        elif any(word in query_lower for word in ["research", "study", "scientific", "paper"]):
            query_type = QueryType.SCIENTIFIC
        elif any(word in query_lower for word in ["news", "current", "recent", "latest", "today"]):
            query_type = QueryType.CURRENT_EVENTS
        
        # Determine complexity
        complexity = "simple"
        if len(query.split()) > 10 or "and" in query_lower or "also" in query_lower:
            complexity = "complex"
        if any(word in query_lower for word in ["comprehensive", "detailed", "thorough", "complete"]):
            complexity = "comprehensive"
        
        # Identify key entities and concepts
        entities = self._extract_entities(query)
        
        return {
            "type": query_type,
            "complexity": complexity,
            "entities": entities,
            "estimated_time": self._estimate_time(query_type, complexity),
            "required_tools": self._determine_tools(query_type, complexity)
        }
    
    def _extract_entities(self, query: str) -> List[str]:
        """Extract key entities and concepts from the query"""
        # Simple entity extraction - can be enhanced with NLP libraries
        words = query.split()
        entities = []
        
        # Look for capitalized words (potential proper nouns)
        for word in words:
            if word[0].isupper() and len(word) > 2:
                entities.append(word.strip('.,!?'))
        
        return entities
    
    def _estimate_time(self, query_type: QueryType, complexity: str) -> int:
        """Estimate processing time in seconds"""
        base_times = {
            QueryType.SIMPLE: 30,
            QueryType.COMPARATIVE: 60,
            QueryType.ANALYTICAL: 90,
            QueryType.FINANCIAL: 45,
            QueryType.SCIENTIFIC: 120,
            QueryType.CURRENT_EVENTS: 40
        }
        
        multipliers = {
            "simple": 1.0,
            "complex": 1.5,
            "comprehensive": 2.0
        }
        
        return int(base_times.get(query_type, 60) * multipliers.get(complexity, 1.0))
    
    def _determine_tools(self, query_type: QueryType, complexity: str) -> List[str]:
        """Determine which tools are needed for this query"""
        base_tools = ["web_search", "llm_synthesis"]
        
        if query_type == QueryType.FINANCIAL:
            base_tools.extend(["financial_search", "market_data"])
        elif query_type == QueryType.SCIENTIFIC:
            base_tools.extend(["academic_search", "paper_analysis"])
        elif query_type == QueryType.COMPARATIVE:
            base_tools.extend(["comparison_engine", "structured_analysis"])
        
        if complexity in ["complex", "comprehensive"]:
            base_tools.extend(["reasoning_engine", "fact_verification"])
        
        return base_tools
    
    def create_execution_plan(self, query: str, analysis: Dict[str, Any]) -> ExecutionPlan:
        """Create a detailed execution plan based on query analysis"""
        query_type = analysis["type"]
        complexity = analysis["complexity"]
        
        # Select strategy template
        strategy_name = self._select_strategy(query_type, complexity)
        template = self.strategy_templates.get(strategy_name, self.strategy_templates["simple"])
        
        # Create sub-tasks
        sub_tasks = []
        for i, step in enumerate(template["steps"]):
            sub_task = SubTask(
                id=f"task_{i+1}",
                description=f"Execute {step} for: {query[:50]}...",
                type=step,
                priority=i + 1,
                dependencies=[f"task_{i}"] if i > 0 else [],
                estimated_time=analysis["estimated_time"] // len(template["steps"])
            )
            sub_tasks.append(sub_task)
        
        return ExecutionPlan(
            strategy=strategy_name,
            steps=sub_tasks,
            total_estimated_time=analysis["estimated_time"],
            adaptation_points=[f"After step {i+1}" for i in range(len(sub_tasks)-1)],
            success_criteria=[
                "Comprehensive information gathered",
                "High-quality sources identified",
                "Logical conclusions drawn",
                "User query fully addressed"
            ]
        )
    
    def _select_strategy(self, query_type: QueryType, complexity: str) -> str:
        """Select the best strategy based on query characteristics"""
        if query_type == QueryType.COMPARATIVE:
            return "comparative"
        elif query_type == QueryType.ANALYTICAL:
            return "analytical"
        elif query_type == QueryType.FINANCIAL:
            return "financial"
        elif complexity in ["complex", "comprehensive"]:
            return "analytical"
        else:
            return "simple"
    
    def adapt_plan(self, plan: ExecutionPlan, intermediate_results: List[Dict]) -> ExecutionPlan:
        """Adapt the execution plan based on intermediate results"""
        # Simple adaptation logic - can be enhanced
        if len(intermediate_results) > 0:
            last_result = intermediate_results[-1]
            
            # If we found limited sources, add more search steps
            if last_result.get("source_count", 0) < 3:
                additional_search = SubTask(
                    id=f"task_additional_{len(plan.steps)+1}",
                    description="Additional targeted search for more sources",
                    type="enhanced_search",
                    priority=len(plan.steps) + 1,
                    dependencies=[plan.steps[-1].id],
                    estimated_time=30
                )
                plan.steps.append(additional_search)
                plan.total_estimated_time += 30
        
        return plan

class WorkingMemory:
    """Manages working memory for the current task"""
    
    def __init__(self):
        self.data: Dict[str, Any] = {}
        self.context_history: List[Dict[str, Any]] = []
        self.intermediate_results: List[Dict[str, Any]] = []
    
    def store(self, key: str, value: Any, metadata: Optional[Dict] = None):
        """Store information in working memory"""
        self.data[key] = {
            "value": value,
            "timestamp": time.time(),
            "metadata": metadata or {}
        }
    
    def retrieve(self, key: str) -> Any:
        """Retrieve information from working memory"""
        return self.data.get(key, {}).get("value")
    
    def add_intermediate_result(self, step: str, result: Dict[str, Any]):
        """Add an intermediate result from a completed step"""
        self.intermediate_results.append({
            "step": step,
            "result": result,
            "timestamp": time.time()
        })
    
    def get_context(self) -> Dict[str, Any]:
        """Get the current context for reasoning"""
        return {
            "current_data": self.data,
            "intermediate_results": self.intermediate_results,
            "history_length": len(self.context_history)
        }

class AgentCore:
    """Main agent core that orchestrates the research process"""
    
    def __init__(self):
        self.planner = TaskPlanner()
        self.active_agents: Dict[str, AgentState] = {}
        logger.info("AgentCore initialized")
    
    async def create_research_task(
        self, 
        query: str, 
        preferences: Optional[Dict[str, Any]] = None
    ) -> str:
        """Create a new research task and return task ID"""
        
        task_id = str(uuid.uuid4())
        agent_id = f"agent_{task_id[:8]}"
        
        # Initialize agent state
        agent_state = AgentState(
            agent_id=agent_id,
            task_id=task_id,
            status=TaskStatus.PLANNING,
            current_step=0,
            working_memory={},
            execution_plan=None,
            reasoning_chain=[],
            confidence_scores={},
            start_time=time.time(),
            metadata={
                "query": query,
                "preferences": preferences or {},
                "created_at": datetime.now().isoformat()
            }
        )
        
        self.active_agents[task_id] = agent_state
        
        # Start planning phase
        asyncio.create_task(self._execute_planning_phase(task_id, query))
        
        logger.info(f"Created research task {task_id} for query: {query[:100]}...")
        return task_id
    
    async def _execute_planning_phase(self, task_id: str, query: str):
        """Execute the planning phase for a research task"""
        try:
            agent_state = self.active_agents[task_id]
            
            # Analyze query
            analysis = self.planner.analyze_query(query)
            logger.info(f"Query analysis for {task_id}: {analysis}")
            
            # Create execution plan
            execution_plan = self.planner.create_execution_plan(query, analysis)
            agent_state.execution_plan = execution_plan
            
            # Update state
            agent_state.status = TaskStatus.EXECUTING
            agent_state.working_memory = WorkingMemory().data
            
            # Add to reasoning chain
            agent_state.reasoning_chain.append({
                "step": "planning",
                "analysis": analysis,
                "plan": asdict(execution_plan),
                "timestamp": time.time()
            })
            
            logger.info(f"Planning completed for {task_id}. Strategy: {execution_plan.strategy}")
            
            # Start execution (placeholder for now)
            agent_state.status = TaskStatus.COMPLETED
            agent_state.confidence_scores["planning"] = 0.85
            
        except Exception as e:
            logger.error(f"Planning phase failed for {task_id}: {e}")
            agent_state = self.active_agents.get(task_id)
            if agent_state:
                agent_state.status = TaskStatus.FAILED
    
    def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get the current status of a research task"""
        agent_state = self.active_agents.get(task_id)
        if not agent_state:
            return None
        
        return {
            "task_id": task_id,
            "status": agent_state.status.value,
            "current_step": agent_state.current_step,
            "progress": self._calculate_progress(agent_state),
            "execution_plan": asdict(agent_state.execution_plan) if agent_state.execution_plan else None,
            "reasoning_chain": agent_state.reasoning_chain,
            "confidence_scores": agent_state.confidence_scores,
            "processing_time": time.time() - agent_state.start_time,
            "metadata": agent_state.metadata
        }
    
    def _calculate_progress(self, agent_state: AgentState) -> float:
        """Calculate the progress percentage for a task"""
        if agent_state.status == TaskStatus.COMPLETED:
            return 1.0
        elif agent_state.status == TaskStatus.FAILED:
            return 0.0
        elif not agent_state.execution_plan:
            return 0.1  # Planning phase
        else:
            total_steps = len(agent_state.execution_plan.steps)
            if total_steps == 0:
                return 0.5
            return min(0.95, agent_state.current_step / total_steps)
    
    def cleanup_completed_tasks(self, max_age_hours: int = 24):
        """Clean up old completed tasks"""
        current_time = time.time()
        to_remove = []
        
        for task_id, agent_state in self.active_agents.items():
            age_hours = (current_time - agent_state.start_time) / 3600
            if age_hours > max_age_hours and agent_state.status in [TaskStatus.COMPLETED, TaskStatus.FAILED]:
                to_remove.append(task_id)
        
        for task_id in to_remove:
            del self.active_agents[task_id]
            logger.info(f"Cleaned up task {task_id}")

# Global agent core instance
agent_core = AgentCore()