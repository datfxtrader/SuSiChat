
import asyncio
import time
import logging
from typing import Dict, List, Any, Optional, Set
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict, deque
import numpy as np

from agent_core import BaseAgent, Task, TaskStatus, AgentMessage, AgentState, agent_registry

logger = logging.getLogger("enhanced_agents")

class CollaborationRole(Enum):
    COORDINATOR = "coordinator"
    RESEARCHER = "researcher"
    ANALYZER = "analyzer"
    SYNTHESIZER = "synthesizer"
    VALIDATOR = "validator"

@dataclass
class TeamConfiguration:
    """Configuration for agent teams"""
    max_agents: int = 3
    coordination_strategy: str = "hierarchical"  # hierarchical, peer-to-peer, hybrid
    task_distribution: str = "load_balanced"  # load_balanced, expertise_based, round_robin
    communication_pattern: str = "hub_spoke"  # hub_spoke, mesh, chain
    timeout_seconds: int = 300

@dataclass
class AgentCapability:
    """Represents an agent's capabilities"""
    domain_expertise: Set[str] = field(default_factory=set)
    task_types: Set[str] = field(default_factory=set)
    performance_score: float = 0.8
    load_capacity: int = 5
    current_load: int = 0
    specializations: Set[str] = field(default_factory=set)

class EnhancedAgent(BaseAgent):
    """Enhanced agent with collaboration capabilities"""
    
    def __init__(self, agent_id: str, config: Dict[str, Any]):
        super().__init__(agent_id, config)
        
        # Collaboration capabilities
        self.role = CollaborationRole(config.get("role", "researcher"))
        self.capabilities = AgentCapability()
        self.team_id: Optional[str] = None
        self.team_members: Set[str] = set()
        
        # Communication
        self.collaboration_history = deque(maxlen=100)
        self.shared_context: Dict[str, Any] = {}
        
        # Performance optimization
        self.task_preferences = config.get("task_preferences", {})
        self.optimization_level = config.get("optimization_level", "balanced")
    
    async def join_team(self, team_id: str, team_members: Set[str]):
        """Join a collaborative team"""
        self.team_id = team_id
        self.team_members = team_members
        
        # Connect to team members
        for member_id in team_members:
            if member_id != self.agent_id:
                member_agent = agent_registry.get_agent(member_id)
                if member_agent:
                    self.connect_to_agent(member_agent)
        
        logger.info(f"Agent {self.agent_id} joined team {team_id} with {len(team_members)} members")
    
    async def leave_team(self):
        """Leave current team"""
        if self.team_id:
            logger.info(f"Agent {self.agent_id} leaving team {self.team_id}")
            
            # Disconnect from team members
            for member_id in list(self.team_members):
                self.disconnect_from_agent(member_id)
            
            self.team_id = None
            self.team_members.clear()
            self.shared_context.clear()
    
    async def collaborate_on_task(self, task: Task, coordination_strategy: str = "hierarchical") -> Dict[str, Any]:
        """Collaborate with team members on a task"""
        if not self.team_members:
            # Execute solo
            return await self.execute_task(task)
        
        if coordination_strategy == "hierarchical":
            return await self._hierarchical_collaboration(task)
        elif coordination_strategy == "peer_to_peer":
            return await self._peer_to_peer_collaboration(task)
        else:
            return await self._hybrid_collaboration(task)
    
    async def _hierarchical_collaboration(self, task: Task) -> Dict[str, Any]:
        """Hierarchical collaboration with coordinator"""
        if self.role == CollaborationRole.COORDINATOR:
            return await self._coordinate_team_task(task)
        else:
            return await self._execute_assigned_subtask(task)
    
    async def _coordinate_team_task(self, task: Task) -> Dict[str, Any]:
        """Coordinate team execution of task"""
        logger.info(f"Coordinator {self.agent_id} managing task {task.task_id}")
        
        # Break down task into subtasks
        subtasks = await self._decompose_task(task)
        
        # Assign subtasks to team members
        assignments = await self._assign_subtasks(subtasks)
        
        # Execute subtasks in parallel
        subtask_futures = []
        for agent_id, subtask in assignments.items():
            if agent_id != self.agent_id:
                future = self._delegate_subtask(agent_id, subtask)
                subtask_futures.append((agent_id, future))
        
        # Wait for all subtasks to complete
        results = {}
        for agent_id, future in subtask_futures:
            try:
                result = await asyncio.wait_for(future, timeout=task.requirements.get("timeout", 300))
                results[agent_id] = result
            except asyncio.TimeoutError:
                logger.warning(f"Subtask timeout for agent {agent_id}")
                results[agent_id] = {"error": "timeout"}
            except Exception as e:
                logger.error(f"Subtask error for agent {agent_id}: {e}")
                results[agent_id] = {"error": str(e)}
        
        # Synthesize results
        final_result = await self._synthesize_results(task, results)
        
        return final_result
    
    async def _decompose_task(self, task: Task) -> List[Dict[str, Any]]:
        """Decompose complex task into subtasks"""
        # Simple decomposition based on task type
        task_type = task.task_type
        
        if task_type == "research":
            return [
                {"type": "information_gathering", "priority": 1},
                {"type": "fact_verification", "priority": 2},
                {"type": "analysis", "priority": 3},
                {"type": "synthesis", "priority": 4}
            ]
        elif task_type == "analysis":
            return [
                {"type": "data_collection", "priority": 1},
                {"type": "statistical_analysis", "priority": 2},
                {"type": "interpretation", "priority": 3}
            ]
        else:
            # Default decomposition
            return [
                {"type": "processing", "priority": 1},
                {"type": "validation", "priority": 2}
            ]
    
    async def _assign_subtasks(self, subtasks: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        """Assign subtasks to team members based on capabilities"""
        assignments = {}
        available_agents = list(self.team_members)
        
        # Sort subtasks by priority
        sorted_subtasks = sorted(subtasks, key=lambda x: x.get("priority", 0))
        
        # Assign based on agent capabilities
        for i, subtask in enumerate(sorted_subtasks):
            if available_agents:
                # Simple round-robin for now
                agent_id = available_agents[i % len(available_agents)]
                assignments[agent_id] = subtask
        
        return assignments
    
    async def _delegate_subtask(self, agent_id: str, subtask: Dict[str, Any]) -> Dict[str, Any]:
        """Delegate subtask to specific agent"""
        message_content = {
            "action": "execute_subtask",
            "subtask": subtask,
            "context": self.shared_context
        }
        
        response = await self.send_message(
            recipient=agent_id,
            content=message_content,
            message_type="delegation",
            requires_response=True
        )
        
        return response or {"error": "no_response"}
    
    async def _synthesize_results(self, task: Task, results: Dict[str, Any]) -> Dict[str, Any]:
        """Synthesize results from multiple agents"""
        successful_results = {
            agent_id: result for agent_id, result in results.items()
            if not result.get("error")
        }
        
        if not successful_results:
            return {"error": "All subtasks failed", "details": results}
        
        # Simple synthesis - combine all successful results
        synthesized = {
            "task_id": task.task_id,
            "status": "completed",
            "agent_contributions": successful_results,
            "synthesis_method": "collaborative",
            "participating_agents": list(successful_results.keys()),
            "completion_time": time.time()
        }
        
        # Extract key information
        if "information_gathering" in str(successful_results):
            synthesized["research_data"] = "Gathered from multiple sources"
        
        if "analysis" in str(successful_results):
            synthesized["analysis_results"] = "Combined analytical insights"
        
        return synthesized
    
    async def handle_message(self, message: AgentMessage) -> Optional[Dict[str, Any]]:
        """Handle incoming messages with collaboration support"""
        action = message.content.get("action")
        
        if action == "execute_subtask":
            return await self._handle_subtask_delegation(message)
        elif action == "share_context":
            return await self._handle_context_sharing(message)
        elif action == "request_collaboration":
            return await self._handle_collaboration_request(message)
        else:
            # Handle other message types
            return await self._handle_general_message(message)
    
    async def _handle_subtask_delegation(self, message: AgentMessage) -> Dict[str, Any]:
        """Handle subtask delegation from coordinator"""
        subtask = message.content.get("subtask", {})
        context = message.content.get("context", {})
        
        # Update shared context
        self.shared_context.update(context)
        
        # Create task from subtask
        task = Task(
            query=subtask.get("description", "Delegated subtask"),
            task_type=subtask.get("type", "general"),
            priority=subtask.get("priority", 0),
            context=context
        )
        
        try:
            result = await self.execute_task(task)
            return {
                "status": "completed",
                "result": result,
                "agent_id": self.agent_id
            }
        except Exception as e:
            return {
                "status": "failed",
                "error": str(e),
                "agent_id": self.agent_id
            }
    
    async def process_task(self, task: Task) -> Dict[str, Any]:
        """Process task with role-specific behavior"""
        if self.role == CollaborationRole.RESEARCHER:
            return await self._research_task(task)
        elif self.role == CollaborationRole.ANALYZER:
            return await self._analyze_task(task)
        elif self.role == CollaborationRole.SYNTHESIZER:
            return await self._synthesize_task(task)
        elif self.role == CollaborationRole.VALIDATOR:
            return await self._validate_task(task)
        else:
            return await self._general_task(task)
    
    async def _research_task(self, task: Task) -> Dict[str, Any]:
        """Research-specific task processing"""
        return {
            "type": "research",
            "findings": f"Research results for: {task.query}",
            "sources": ["source1", "source2", "source3"],
            "confidence": 0.85,
            "agent_role": "researcher"
        }
    
    async def _analyze_task(self, task: Task) -> Dict[str, Any]:
        """Analysis-specific task processing"""
        return {
            "type": "analysis",
            "insights": f"Analysis of: {task.query}",
            "metrics": {"accuracy": 0.9, "completeness": 0.8},
            "agent_role": "analyzer"
        }
    
    async def _synthesize_task(self, task: Task) -> Dict[str, Any]:
        """Synthesis-specific task processing"""
        return {
            "type": "synthesis",
            "summary": f"Synthesized information for: {task.query}",
            "key_points": ["point1", "point2", "point3"],
            "agent_role": "synthesizer"
        }
    
    async def _validate_task(self, task: Task) -> Dict[str, Any]:
        """Validation-specific task processing"""
        return {
            "type": "validation",
            "validation_result": "validated",
            "confidence_score": 0.92,
            "issues_found": [],
            "agent_role": "validator"
        }
    
    async def _general_task(self, task: Task) -> Dict[str, Any]:
        """General task processing"""
        return {
            "type": "general",
            "result": f"Processed: {task.query}",
            "agent_role": str(self.role.value)
        }
    
    async def on_start(self):
        """Enhanced agent startup"""
        logger.info(f"Enhanced agent {self.agent_id} with role {self.role.value} starting")
    
    async def on_stop(self):
        """Enhanced agent shutdown"""
        await self.leave_team()
        logger.info(f"Enhanced agent {self.agent_id} stopped")

class EnhancedMultiAgentOrchestrator:
    """Optimized multi-agent orchestrator with intelligent coordination"""
    
    def __init__(self, tool_registry, memory_manager, config: Dict[str, Any]):
        self.tool_registry = tool_registry
        self.memory_manager = memory_manager
        self.config = config
        
        # Team management
        self.active_teams: Dict[str, List[str]] = {}
        self.team_configurations: Dict[str, TeamConfiguration] = {}
        
        # Performance tracking
        self.orchestrator_metrics = {
            "teams_created": 0,
            "tasks_coordinated": 0,
            "successful_collaborations": 0,
            "failed_collaborations": 0,
            "avg_team_size": 0.0,
            "avg_completion_time": 0.0
        }
        
        # Agent pools
        self.agent_pools = {
            "researchers": [],
            "analyzers": [],
            "synthesizers": [],
            "validators": []
        }
        
        # Load balancing
        self.agent_loads: Dict[str, int] = defaultdict(int)
        self.performance_history: Dict[str, deque] = defaultdict(lambda: deque(maxlen=50))
    
    async def create_agent_team(self, query: str, complexity: Dict[str, Any]) -> List[str]:
        """Create optimal team for query with intelligent agent selection"""
        start_time = time.time()
        
        # Analyze team requirements
        team_requirements = await self._analyze_team_requirements(query, complexity)
        
        # Select optimal agents
        selected_agents = await self._select_optimal_agents(team_requirements)
        
        if not selected_agents:
            # Fallback: create minimal team
            selected_agents = await self._create_fallback_team()
        
        # Create team
        team_id = f"team_{int(time.time())}_{len(self.active_teams)}"
        await self._form_team(team_id, selected_agents, team_requirements)
        
        # Update metrics
        self.orchestrator_metrics["teams_created"] += 1
        self.orchestrator_metrics["avg_team_size"] = (
            (self.orchestrator_metrics["avg_team_size"] * (self.orchestrator_metrics["teams_created"] - 1) + 
             len(selected_agents)) / self.orchestrator_metrics["teams_created"]
        )
        
        creation_time = time.time() - start_time
        logger.info(f"Created team {team_id} with {len(selected_agents)} agents in {creation_time:.2f}s")
        
        return selected_agents
    
    async def _analyze_team_requirements(self, query: str, complexity: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze what kind of team is needed"""
        
        # Determine required roles
        required_roles = set()
        
        # Always need a coordinator for complex tasks
        if complexity.get("level") in ["moderate", "complex"]:
            required_roles.add(CollaborationRole.COORDINATOR)
        
        # Determine domain-specific needs
        if "research" in query.lower():
            required_roles.add(CollaborationRole.RESEARCHER)
        
        if any(word in query.lower() for word in ["analyze", "analysis", "evaluate"]):
            required_roles.add(CollaborationRole.ANALYZER)
        
        if any(word in query.lower() for word in ["summarize", "combine", "synthesize"]):
            required_roles.add(CollaborationRole.SYNTHESIZER)
        
        if any(word in query.lower() for word in ["verify", "validate", "check", "confirm"]):
            required_roles.add(CollaborationRole.VALIDATOR)
        
        # Default to researcher if no specific roles identified
        if not required_roles:
            required_roles.add(CollaborationRole.RESEARCHER)
        
        # Determine team size
        complexity_level = complexity.get("level", "simple")
        if complexity_level == "simple":
            max_agents = 2
        elif complexity_level == "moderate":
            max_agents = 3
        else:
            max_agents = 4
        
        return {
            "required_roles": required_roles,
            "max_agents": max_agents,
            "coordination_strategy": "hierarchical" if len(required_roles) > 2 else "peer_to_peer",
            "timeout": complexity.get("estimated_processing_time", 300)
        }
    
    async def _select_optimal_agents(self, requirements: Dict[str, Any]) -> List[str]:
        """Select optimal agents based on requirements"""
        required_roles = requirements["required_roles"]
        max_agents = requirements["max_agents"]
        
        selected = []
        role_assignments = {}
        
        # Get available agents by role
        available_by_role = await self._get_available_agents_by_role()
        
        # Assign agents to roles
        for role in required_roles:
            if len(selected) >= max_agents:
                break
            
            candidates = available_by_role.get(role, [])
            if candidates:
                # Select best candidate based on performance and load
                best_agent = await self._select_best_agent(candidates)
                if best_agent and best_agent not in selected:
                    selected.append(best_agent)
                    role_assignments[best_agent] = role
        
        # Fill remaining slots with general agents if needed
        if len(selected) < max_agents:
            all_available = []
            for agents in available_by_role.values():
                all_available.extend(agents)
            
            for agent_id in all_available:
                if agent_id not in selected and len(selected) < max_agents:
                    selected.append(agent_id)
        
        return selected
    
    async def _get_available_agents_by_role(self) -> Dict[CollaborationRole, List[str]]:
        """Get available agents grouped by role"""
        available = defaultdict(list)
        
        for agent_id, agent in agent_registry.agents.items():
            if (isinstance(agent, EnhancedAgent) and 
                agent.state == AgentState.RUNNING and 
                self.agent_loads[agent_id] < 3):  # Max 3 concurrent tasks
                
                available[agent.role].append(agent_id)
        
        return available
    
    async def _select_best_agent(self, candidates: List[str]) -> Optional[str]:
        """Select best agent from candidates based on performance and load"""
        if not candidates:
            return None
        
        scores = {}
        for agent_id in candidates:
            agent = agent_registry.get_agent(agent_id)
            if not agent:
                continue
            
            # Calculate composite score
            load_score = 1.0 - (self.agent_loads[agent_id] / 5.0)  # Normalize load
            performance_score = agent.performance.success_rate
            
            # Recent performance trend
            recent_performance = self.performance_history[agent_id]
            trend_score = 0.8  # Default
            if len(recent_performance) > 5:
                trend_score = np.mean(list(recent_performance)[-5:])
            
            # Weighted combination
            composite_score = (
                load_score * 0.4 +
                performance_score * 0.4 +
                trend_score * 0.2
            )
            
            scores[agent_id] = composite_score
        
        # Return agent with highest score
        return max(scores, key=scores.get) if scores else candidates[0]
    
    async def _form_team(self, team_id: str, agent_ids: List[str], requirements: Dict[str, Any]):
        """Form team and establish connections"""
        self.active_teams[team_id] = agent_ids
        
        # Create team configuration
        config = TeamConfiguration(
            max_agents=len(agent_ids),
            coordination_strategy=requirements.get("coordination_strategy", "hierarchical"),
            timeout_seconds=requirements.get("timeout", 300)
        )
        self.team_configurations[team_id] = config
        
        # Connect agents
        for agent_id in agent_ids:
            agent = agent_registry.get_agent(agent_id)
            if isinstance(agent, EnhancedAgent):
                await agent.join_team(team_id, set(agent_ids))
    
    async def execute_coordinated_task(self, query: str, team: List[str], resources: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute task with team coordination"""
        start_time = time.time()
        
        if not team:
            raise ValueError("No team provided for task execution")
        
        # Create task
        task = Task(
            query=query,
            task_type="collaborative",
            requirements=resources or {}
        )
        
        try:
            # Find coordinator (first agent or designated coordinator)
            coordinator_id = team[0]
            coordinator = agent_registry.get_agent(coordinator_id)
            
            if not isinstance(coordinator, EnhancedAgent):
                raise RuntimeError("Coordinator is not an enhanced agent")
            
            # Execute collaborative task
            result = await coordinator.collaborate_on_task(task)
            
            # Update metrics
            self.orchestrator_metrics["tasks_coordinated"] += 1
            self.orchestrator_metrics["successful_collaborations"] += 1
            
            execution_time = time.time() - start_time
            self._update_avg_completion_time(execution_time)
            
            # Update performance history
            for agent_id in team:
                self.performance_history[agent_id].append(1.0)  # Success
            
            return {
                "status": "success",
                "result": result,
                "team_size": len(team),
                "execution_time": execution_time,
                "coordination_method": "collaborative"
            }
            
        except Exception as e:
            # Update failure metrics
            self.orchestrator_metrics["failed_collaborations"] += 1
            
            # Update performance history
            for agent_id in team:
                self.performance_history[agent_id].append(0.0)  # Failure
            
            logger.error(f"Collaborative task execution failed: {e}")
            
            return {
                "status": "error",
                "error": str(e),
                "team_size": len(team),
                "execution_time": time.time() - start_time
            }
        
        finally:
            # Clean up team
            await self._dissolve_team(team)
    
    async def _dissolve_team(self, team: List[str]):
        """Dissolve team and clean up connections"""
        for agent_id in team:
            agent = agent_registry.get_agent(agent_id)
            if isinstance(agent, EnhancedAgent):
                await agent.leave_team()
        
        # Remove from active teams
        team_id = None
        for tid, members in self.active_teams.items():
            if set(members) == set(team):
                team_id = tid
                break
        
        if team_id:
            del self.active_teams[team_id]
            self.team_configurations.pop(team_id, None)
    
    def _update_avg_completion_time(self, completion_time: float):
        """Update average completion time"""
        current_avg = self.orchestrator_metrics["avg_completion_time"]
        total_tasks = self.orchestrator_metrics["tasks_coordinated"]
        
        if total_tasks == 1:
            self.orchestrator_metrics["avg_completion_time"] = completion_time
        else:
            self.orchestrator_metrics["avg_completion_time"] = (
                (current_avg * (total_tasks - 1) + completion_time) / total_tasks
            )
    
    async def _create_fallback_team(self) -> List[str]:
        """Create fallback team when no optimal team found"""
        # Just get any available agent
        available_agents = [
            agent_id for agent_id, agent in agent_registry.agents.items()
            if agent.state == AgentState.RUNNING
        ]
        
        return available_agents[:1] if available_agents else []
    
    def get_orchestrator_stats(self) -> Dict[str, Any]:
        """Get orchestrator performance statistics"""
        return {
            "metrics": self.orchestrator_metrics,
            "active_teams": len(self.active_teams),
            "total_agents": len(agent_registry.agents),
            "running_agents": len(agent_registry.get_agents_by_state(AgentState.RUNNING)),
            "agent_loads": dict(self.agent_loads)
        }

# Register enhanced agent type
agent_registry.register_agent_type("enhanced", EnhancedAgent)
