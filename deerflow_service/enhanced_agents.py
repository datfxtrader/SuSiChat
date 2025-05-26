
from typing import List, Dict, Any, Optional, Set
import asyncio
import uuid
import time
import logging
from dataclasses import dataclass
from enum import Enum
from enhanced_tools import EnhancedToolRegistry, ToolResult
from enhanced_memory import PersistentMemoryManager

logger = logging.getLogger("enhanced_agents")

class AgentRole(Enum):
    COORDINATOR = "coordinator"
    RESEARCHER = "researcher"
    ANALYST = "analyst"
    VALIDATOR = "validator"
    SYNTHESIZER = "synthesizer"
    SPECIALIST = "specialist"

@dataclass
class AgentCapability:
    """Defines what an agent can do"""
    name: str
    description: str
    required_tools: List[str]
    output_type: str
    confidence: float = 0.8

@dataclass
class AgentMessage:
    """Message passed between agents"""
    sender_id: str
    recipient_id: str
    message_type: str
    content: Any
    priority: int = 5
    timestamp: float = None

class SpecializedAgent:
    """Enhanced specialized agent with capabilities"""
    
    def __init__(
        self,
        agent_id: str,
        role: AgentRole,
        capabilities: List[AgentCapability],
        tool_registry: EnhancedToolRegistry,
        memory_manager: PersistentMemoryManager
    ):
        self.agent_id = agent_id
        self.role = role
        self.capabilities = capabilities
        self.tool_registry = tool_registry
        self.memory_manager = memory_manager
        
        self.message_queue = asyncio.Queue()
        self.state = "idle"
        self.current_task = None
        self.performance_metrics = {
            "tasks_completed": 0,
            "tasks_failed": 0,
            "average_confidence": 0.0,
            "total_execution_time": 0.0
        }
    
    async def process_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Process a task based on capabilities"""
        self.state = "working"
        self.current_task = task
        start_time = time.time()
        
        try:
            # Determine best capability for task
            capability = self._select_capability(task)
            if not capability:
                return {
                    "status": "error",
                    "error": "No suitable capability for task",
                    "agent_id": self.agent_id
                }
            
            # Execute task using tools
            results = []
            for tool_name in capability.required_tools:
                # Check if tool exists
                if tool_name in self.tool_registry.tools:
                    tool_result = await self.tool_registry.execute_tool(
                        tool_name,
                        **task.get("parameters", {})
                    )
                    results.append(tool_result)
                else:
                    # Mock tool result for non-existent tools
                    results.append(ToolResult(
                        success=True,
                        data=f"Mock result from {tool_name}",
                        metadata={"tool": tool_name, "mock": True}
                    ))
            
            # Process results based on role
            processed_result = await self._process_results(
                results, 
                capability, 
                task
            )
            
            # Store in memory
            await self._update_memory(task, processed_result)
            
            # Update metrics
            execution_time = time.time() - start_time
            self.performance_metrics["tasks_completed"] += 1
            self.performance_metrics["total_execution_time"] += execution_time
            
            self.state = "idle"
            return processed_result
            
        except Exception as e:
            self.performance_metrics["tasks_failed"] += 1
            self.state = "error"
            
            return {
                "status": "error",
                "error": str(e),
                "agent_id": self.agent_id
            }
    
    def _select_capability(self, task: Dict[str, Any]) -> Optional[AgentCapability]:
        """Select best capability for task"""
        task_type = task.get("type", "")
        
        # Score each capability
        best_capability = None
        best_score = 0.0
        
        for capability in self.capabilities:
            score = self._score_capability(capability, task)
            if score > best_score:
                best_score = score
                best_capability = capability
        
        return best_capability if best_score > 0.5 else None
    
    def _score_capability(
        self, 
        capability: AgentCapability, 
        task: Dict[str, Any]
    ) -> float:
        """Score how well capability matches task"""
        score = 0.0
        
        task_keywords = task.get("keywords", [])
        task_description = task.get("description", "")
        capability_keywords = capability.description.lower().split()
        
        # Keyword matching
        if task_keywords:
            matches = sum(
                1 for keyword in task_keywords 
                if keyword.lower() in capability_keywords
            )
            if matches > 0:
                score += (matches / len(task_keywords)) * 0.6
        
        # Description matching
        if task_description:
            desc_words = task_description.lower().split()
            desc_matches = sum(
                1 for word in desc_words
                if word in capability_keywords
            )
            if desc_matches > 0:
                score += (desc_matches / len(desc_words)) * 0.4
        
        return score * capability.confidence
    
    async def _process_results(
        self,
        results: List[ToolResult],
        capability: AgentCapability,
        task: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process tool results based on agent role"""
        
        if self.role == AgentRole.RESEARCHER:
            # Aggregate and summarize findings
            successful_results = [r for r in results if r.success]
            
            return {
                "status": "success",
                "agent_id": self.agent_id,
                "role": self.role.value,
                "capability_used": capability.name,
                "findings": [r.data for r in successful_results],
                "confidence": sum(r.metadata.get("confidence", 0.5) for r in successful_results) / len(successful_results) if successful_results else 0.0
            }
            
        elif self.role == AgentRole.ANALYST:
            # Analyze patterns and insights
            successful_results = [r for r in results if r.success]
            
            return {
                "status": "success",
                "agent_id": self.agent_id,
                "role": self.role.value,
                "capability_used": capability.name,
                "analysis": "Pattern analysis from tool results",
                "insights": [f"Insight from {r.metadata.get('tool', 'unknown')}" for r in successful_results],
                "confidence": 0.7
            }
            
        elif self.role == AgentRole.COORDINATOR:
            # Coordinate and integrate
            if task.get("type") == "decomposition":
                return await self._decompose_task(task)
            elif task.get("type") == "integration":
                return await self._integrate_results(task)
            
        # Default processing
        return {
            "status": "success",
            "agent_id": self.agent_id,
            "role": self.role.value,
            "capability_used": capability.name,
            "results": [r.to_dict() for r in results],
            "confidence": 0.6
        }
    
    async def _decompose_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Decompose a complex task into subtasks"""
        main_task = task.get("parameters", {}).get("task", "")
        
        # Simple task decomposition based on keywords
        subtasks = []
        
        if "research" in main_task.lower():
            subtasks.append({
                "type": "research",
                "description": f"Research: {main_task}",
                "parameters": {"query": main_task},
                "keywords": ["research", "find", "gather"]
            })
        
        if "analyze" in main_task.lower() or "analysis" in main_task.lower():
            subtasks.append({
                "type": "analysis",
                "description": f"Analyze: {main_task}",
                "parameters": {"data": main_task},
                "keywords": ["analyze", "evaluate", "compare"]
            })
        
        if "validate" in main_task.lower() or "verify" in main_task.lower():
            subtasks.append({
                "type": "validation",
                "description": f"Validate: {main_task}",
                "parameters": {"content": main_task},
                "keywords": ["validate", "verify", "check"]
            })
        
        # If no specific keywords, create a general research task
        if not subtasks:
            subtasks.append({
                "type": "research",
                "description": f"General research: {main_task}",
                "parameters": {"query": main_task},
                "keywords": ["research"]
            })
        
        return {
            "status": "success",
            "agent_id": self.agent_id,
            "subtasks": subtasks,
            "original_task": main_task
        }
    
    async def _integrate_results(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Integrate results from multiple agents"""
        results = task.get("parameters", {}).get("results", [])
        original_task = task.get("parameters", {}).get("original_task", "")
        
        successful_results = [r for r in results if r.get("status") == "success"]
        
        # Simple integration - combine findings and insights
        integrated_findings = []
        integrated_insights = []
        total_confidence = 0.0
        
        for result in successful_results:
            if "findings" in result:
                integrated_findings.extend(result["findings"])
            if "insights" in result:
                integrated_insights.extend(result["insights"])
            if "analysis" in result:
                integrated_insights.append(result["analysis"])
            
            total_confidence += result.get("confidence", 0.0)
        
        average_confidence = total_confidence / len(successful_results) if successful_results else 0.0
        
        return {
            "status": "success",
            "agent_id": self.agent_id,
            "original_task": original_task,
            "integrated_findings": integrated_findings,
            "integrated_insights": integrated_insights,
            "confidence": average_confidence,
            "summary": f"Integrated {len(successful_results)} agent results for: {original_task}"
        }
    
    async def _update_memory(
        self, 
        task: Dict[str, Any], 
        result: Dict[str, Any]
    ):
        """Update agent memory with task results"""
        try:
            await self.memory_manager.store_memory(
                agent_id=self.agent_id,
                memory_type="episodic",
                content=f"Completed task: {task.get('description', 'Unknown')}",
                metadata={
                    "task": task,
                    "result": result,
                    "role": self.role.value
                },
                importance=0.7
            )
        except Exception as e:
            logger.warning(f"Failed to store memory: {e}")
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get agent performance statistics"""
        total_tasks = self.performance_metrics["tasks_completed"] + self.performance_metrics["tasks_failed"]
        success_rate = (
            self.performance_metrics["tasks_completed"] / total_tasks 
            if total_tasks > 0 else 0.0
        )
        avg_execution_time = (
            self.performance_metrics["total_execution_time"] / self.performance_metrics["tasks_completed"]
            if self.performance_metrics["tasks_completed"] > 0 else 0.0
        )
        
        return {
            "agent_id": self.agent_id,
            "role": self.role.value,
            "state": self.state,
            "tasks_completed": self.performance_metrics["tasks_completed"],
            "tasks_failed": self.performance_metrics["tasks_failed"],
            "success_rate": success_rate,
            "average_execution_time": avg_execution_time,
            "capabilities_count": len(self.capabilities)
        }

class EnhancedMultiAgentOrchestrator:
    """Sophisticated multi-agent orchestration"""
    
    def __init__(
        self,
        tool_registry: EnhancedToolRegistry,
        memory_manager: PersistentMemoryManager,
        config: Dict[str, Any]
    ):
        self.tool_registry = tool_registry
        self.memory_manager = memory_manager
        self.config = config
        
        self.agents: Dict[str, SpecializedAgent] = {}
        self.task_queue = asyncio.Queue()
        self.results_cache: Dict[str, Any] = {}
    
    async def create_agent_team(
        self,
        task: str,
        complexity: str
    ) -> Dict[str, SpecializedAgent]:
        """Create optimal agent team for task"""
        
        team = {}
        
        # Always create coordinator
        coordinator = await self._create_agent(
            role=AgentRole.COORDINATOR,
            capabilities=[
                AgentCapability(
                    name="task_decomposition",
                    description="Decompose complex tasks into subtasks",
                    required_tools=["task_analyzer"],
                    output_type="task_list"
                ),
                AgentCapability(
                    name="result_integration",
                    description="Integrate results from multiple agents",
                    required_tools=["result_synthesizer"],
                    output_type="integrated_result"
                )
            ]
        )
        team[coordinator.agent_id] = coordinator
        
        # Add specialists based on task analysis
        task_analysis = await self._analyze_task_requirements(task)
        
        for requirement in task_analysis["requirements"]:
            if requirement["type"] == "research":
                researcher = await self._create_agent(
                    role=AgentRole.RESEARCHER,
                    capabilities=self._get_research_capabilities()
                )
                team[researcher.agent_id] = researcher
                
            elif requirement["type"] == "analysis":
                analyst = await self._create_agent(
                    role=AgentRole.ANALYST,
                    capabilities=self._get_analysis_capabilities()
                )
                team[analyst.agent_id] = analyst
                
            elif requirement["type"] == "validation":
                validator = await self._create_agent(
                    role=AgentRole.VALIDATOR,
                    capabilities=self._get_validation_capabilities()
                )
                team[validator.agent_id] = validator
        
        return team
    
    async def _create_agent(
        self,
        role: AgentRole,
        capabilities: List[AgentCapability]
    ) -> SpecializedAgent:
        """Create a specialized agent"""
        
        agent_id = f"{role.value}_{uuid.uuid4().hex[:8]}"
        
        agent = SpecializedAgent(
            agent_id=agent_id,
            role=role,
            capabilities=capabilities,
            tool_registry=self.tool_registry,
            memory_manager=self.memory_manager
        )
        
        self.agents[agent_id] = agent
        
        return agent
    
    async def execute_coordinated_task(
        self,
        task: str,
        team: Dict[str, SpecializedAgent]
    ) -> Dict[str, Any]:
        """Execute task with coordinated agents"""
        
        # Phase 1: Task decomposition by coordinator
        coordinator = next(
            agent for agent in team.values() 
            if agent.role == AgentRole.COORDINATOR
        )
        
        decomposition_result = await coordinator.process_task({
            "type": "decomposition",
            "description": task,
            "parameters": {"task": task}
        })
        
        if decomposition_result["status"] != "success":
            return decomposition_result
        
        # Phase 2: Parallel execution by specialists
        subtasks = decomposition_result.get("subtasks", [])
        agent_tasks = []
        
        for subtask in subtasks:
            # Find best agent for subtask
            best_agent = self._select_agent_for_task(team, subtask)
            if best_agent:
                agent_tasks.append(
                    best_agent.process_task(subtask)
                )
        
        # Execute in parallel with supervision
        results = await self._execute_with_supervision(agent_tasks)
        
        # Phase 3: Result integration
        integration_result = await coordinator.process_task({
            "type": "integration",
            "description": "Integrate agent results",
            "parameters": {
                "results": results,
                "original_task": task
            }
        })
        
        return {
            "status": "success",
            "task": task,
            "team_size": len(team),
            "execution_phases": {
                "decomposition": decomposition_result,
                "execution": results,
                "integration": integration_result
            },
            "final_result": integration_result
        }
    
    async def _execute_with_supervision(
        self,
        agent_tasks: List[asyncio.Task]
    ) -> List[Dict[str, Any]]:
        """Execute tasks with supervision and error handling"""
        
        results = []
        
        try:
            # Execute with timeout and error handling
            completed_tasks = await asyncio.wait_for(
                asyncio.gather(*agent_tasks, return_exceptions=True),
                timeout=self.config.get("task_timeout", 300)
            )
            
            for i, result in enumerate(completed_tasks):
                if isinstance(result, Exception):
                    results.append({
                        "status": "error",
                        "error": str(result),
                        "task_index": i
                    })
                else:
                    results.append(result)
                    
        except asyncio.TimeoutError:
            # Handle timeout
            for task in agent_tasks:
                if not task.done():
                    task.cancel()
            
            results.append({
                "status": "error",
                "error": "Task execution timeout"
            })
        
        return results
    
    def _select_agent_for_task(
        self,
        team: Dict[str, SpecializedAgent],
        task: Dict[str, Any]
    ) -> Optional[SpecializedAgent]:
        """Select best agent for a specific task"""
        
        best_agent = None
        best_score = 0.0
        
        for agent in team.values():
            if agent.role == AgentRole.COORDINATOR:
                continue
                
            # Score agent suitability
            score = self._score_agent_for_task(agent, task)
            if score > best_score:
                best_score = score
                best_agent = agent
        
        return best_agent if best_score > 0.5 else None
    
    def _score_agent_for_task(
        self,
        agent: SpecializedAgent,
        task: Dict[str, Any]
    ) -> float:
        """Score how well an agent matches a task"""
        
        # Consider agent role
        role_scores = {
            AgentRole.RESEARCHER: 0.8 if "research" in str(task).lower() else 0.3,
            AgentRole.ANALYST: 0.8 if "analyze" in str(task).lower() else 0.3,
            AgentRole.VALIDATOR: 0.8 if "validate" in str(task).lower() else 0.3
        }
        
        base_score = role_scores.get(agent.role, 0.5)
        
        # Consider agent performance
        if agent.performance_metrics["tasks_completed"] > 0:
            success_rate = (
                agent.performance_metrics["tasks_completed"] / 
                (agent.performance_metrics["tasks_completed"] + 
                 agent.performance_metrics["tasks_failed"])
            )
            base_score *= success_rate
        
        # Consider agent availability
        if agent.state != "idle":
            base_score *= 0.5
        
        return base_score
    
    async def _analyze_task_requirements(
        self,
        task: str
    ) -> Dict[str, Any]:
        """Analyze what types of agents are needed"""
        
        requirements = []
        
        # Simple keyword-based analysis
        task_lower = task.lower()
        
        if any(word in task_lower for word in ["research", "find", "search", "gather"]):
            requirements.append({
                "type": "research",
                "priority": "high"
            })
        
        if any(word in task_lower for word in ["analyze", "compare", "evaluate"]):
            requirements.append({
                "type": "analysis",
                "priority": "high"
            })
        
        if any(word in task_lower for word in ["verify", "validate", "check"]):
            requirements.append({
                "type": "validation",
                "priority": "medium"
            })
        
        return {
            "task": task,
            "requirements": requirements,
            "estimated_complexity": len(requirements)
        }
    
    def _get_research_capabilities(self) -> List[AgentCapability]:
        """Get research agent capabilities"""
        return [
            AgentCapability(
                name="web_research",
                description="Research information from web sources",
                required_tools=["web_search"],
                output_type="research_findings"
            ),
            AgentCapability(
                name="academic_research",
                description="Research academic papers and studies",
                required_tools=["academic_search"],
                output_type="academic_findings"
            )
        ]
    
    def _get_analysis_capabilities(self) -> List[AgentCapability]:
        """Get analysis agent capabilities"""
        return [
            AgentCapability(
                name="data_analysis",
                description="Analyze data and find patterns",
                required_tools=["data_analyzer", "statistics"],
                output_type="analysis_report"
            ),
            AgentCapability(
                name="sentiment_analysis",
                description="Analyze sentiment and opinions",
                required_tools=["sentiment_analyzer"],
                output_type="sentiment_report"
            )
        ]
    
    def _get_validation_capabilities(self) -> List[AgentCapability]:
        """Get validation agent capabilities"""
        return [
            AgentCapability(
                name="fact_checking",
                description="Validate facts and claims",
                required_tools=["fact_checker"],
                output_type="validation_report"
            ),
            AgentCapability(
                name="source_verification",
                description="Verify source credibility",
                required_tools=["source_verifier"],
                output_type="verification_report"
            )
        ]
    
    def get_orchestrator_stats(self) -> Dict[str, Any]:
        """Get orchestrator statistics"""
        agent_stats = {}
        for agent_id, agent in self.agents.items():
            agent_stats[agent_id] = agent.get_performance_stats()
        
        return {
            "total_agents": len(self.agents),
            "agent_stats": agent_stats,
            "cache_size": len(self.results_cache)
        }
