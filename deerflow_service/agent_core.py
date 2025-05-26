# Fix syntax error by removing markdown code block syntax
import asyncio
import time
import logging
import uuid
import weakref
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Set
from dataclasses import dataclass, field
from collections import deque
from enum import Enum
import json

logger = logging.getLogger("agent_core")

class TaskStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PLANNING = "planning"
    EXECUTING = "executing"

class AgentState(Enum):
    INITIALIZED = "initialized"
    STARTING = "starting"
    RUNNING = "running"
    STOPPING = "stopping"
    STOPPED = "stopped"
    ERROR = "error"

@dataclass
class AgentMessage:
    """Optimized message structure for inter-agent communication"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    sender: str = ""
    recipient: str = ""
    content: Dict[str, Any] = field(default_factory=dict)
    priority: int = 0
    timestamp: float = field(default_factory=time.time)
    message_type: str = "general"
    requires_response: bool = False
    correlation_id: Optional[str] = None

    def __lt__(self, other):
        # Higher priority messages first, then by timestamp
        if self.priority != other.priority:
            return self.priority > other.priority
        return self.timestamp < other.timestamp

@dataclass
class Task:
    """Enhanced task representation"""
    task_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    query: str = ""
    task_type: str = "general"
    priority: int = 0
    status: TaskStatus = TaskStatus.PENDING
    created_at: float = field(default_factory=time.time)
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    context: Dict[str, Any] = field(default_factory=dict)
    requirements: Dict[str, Any] = field(default_factory=dict)
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    assigned_agent: Optional[str] = None

@dataclass
class AgentPerformance:
    """Track agent performance metrics"""
    total_tasks: int = 0
    successful_tasks: int = 0
    failed_tasks: int = 0
    avg_response_time: float = 0.0
    last_active: float = field(default_factory=time.time)
    error_rate: float = 0.0

    @property
    def success_rate(self) -> float:
        if self.total_tasks == 0:
            return 0.0
        return self.successful_tasks / self.total_tasks

class BaseAgent(ABC):
    """Optimized base agent with lifecycle management and performance monitoring"""

    def __init__(self, agent_id: str, config: Dict[str, Any]):
        self.agent_id = agent_id
        self.config = config
        self.state = AgentState.INITIALIZED

        # Message handling
        self.message_queue = asyncio.PriorityQueue(maxsize=1000)
        self.processed_messages = deque(maxlen=100)  # Keep last 100 for debugging
        self.pending_responses: Dict[str, asyncio.Future] = {}

        # Task management
        self.current_task: Optional[Task] = None
        self.task_history = deque(maxlen=50)

        # Performance tracking
        self.performance = AgentPerformance()
        self.health_status = {"status": "healthy", "last_check": time.time()}

        # Lifecycle management
        self._running = False
        self._tasks: List[asyncio.Task] = []
        self._shutdown_event = asyncio.Event()

        # Weak references to prevent memory leaks
        self._connections: weakref.WeakValueDictionary = weakref.WeakValueDictionary()

        # Configuration
        self.max_concurrent_tasks = config.get("max_concurrent_tasks", 5)
        self.health_check_interval = config.get("health_check_interval", 30)
        self.message_timeout = config.get("message_timeout", 60)

        logger.info(f"Agent {self.agent_id} initialized")

    async def start(self):
        """Start agent with proper error handling"""
        if self._running:
            logger.warning(f"Agent {self.agent_id} already running")
            return

        try:
            self.state = AgentState.STARTING
            self._running = True

            # Start core processes
            self._tasks.extend([
                asyncio.create_task(self._message_processor()),
                asyncio.create_task(self._health_monitor()),
                asyncio.create_task(self._performance_tracker())
            ])

            # Agent-specific startup
            await self.on_start()

            self.state = AgentState.RUNNING
            self.performance.last_active = time.time()

            logger.info(f"Agent {self.agent_id} started successfully")

        except Exception as e:
            self.state = AgentState.ERROR
            logger.error(f"Failed to start agent {self.agent_id}: {e}")
            await self.stop()
            raise

    async def stop(self):
        """Gracefully stop agent with cleanup"""
        if not self._running:
            return

        logger.info(f"Stopping agent {self.agent_id}")
        self.state = AgentState.STOPPING
        self._running = False

        try:
            # Cancel current task if any
            if self.current_task and self.current_task.status == TaskStatus.RUNNING:
                self.current_task.status = TaskStatus.CANCELLED
                logger.info(f"Cancelled current task {self.current_task.task_id}")

            # Agent-specific cleanup
            await self.on_stop()

            # Cancel all background tasks
            for task in self._tasks:
                if not task.done():
                    task.cancel()

            # Wait for tasks to complete
            if self._tasks:
                await asyncio.gather(*self._tasks, return_exceptions=True)

            self._tasks.clear()
            self.state = AgentState.STOPPED

            logger.info(f"Agent {self.agent_id} stopped successfully")

        except Exception as e:
            logger.error(f"Error stopping agent {self.agent_id}: {e}")
            self.state = AgentState.ERROR

    async def _message_processor(self):
        """Process incoming messages with timeout handling"""
        while self._running:
            try:
                # Wait for message with timeout
                try:
                    message = await asyncio.wait_for(
                        self.message_queue.get(),
                        timeout=1.0
                    )
                except asyncio.TimeoutError:
                    continue

                # Process message
                start_time = time.time()
                response = await self.handle_message(message)
                processing_time = time.time() - start_time

                # Track processed messages
                self.processed_messages.append({
                    "message_id": message.id,
                    "sender": message.sender,
                    "processing_time": processing_time,
                    "timestamp": time.time()
                })

                # Handle response if required
                if message.requires_response and response:
                    await self._send_response(message, response)

                # Update performance
                self._update_message_performance(processing_time)

            except Exception as e:
                logger.error(f"Agent {self.agent_id} message processing error: {e}")
                await asyncio.sleep(0.1)  # Brief pause on error

    async def _health_monitor(self):
        """Monitor agent health and attempt recovery"""
        while self._running:
            try:
                await asyncio.sleep(self.health_check_interval)

                # Check health
                health = await self.check_health()
                self.health_status = health

                if health["status"] != "healthy":
                    logger.warning(f"Agent {self.agent_id} health issue: {health}")

                    # Attempt recovery
                    try:
                        await self.attempt_recovery()
                        logger.info(f"Agent {self.agent_id} recovery successful")
                    except Exception as e:
                        logger.error(f"Agent {self.agent_id} recovery failed: {e}")

            except Exception as e:
                logger.error(f"Health monitoring failed for {self.agent_id}: {e}")

    async def _performance_tracker(self):
        """Track performance metrics"""
        while self._running:
            try:
                await asyncio.sleep(60)  # Update every minute

                # Calculate current performance metrics
                current_time = time.time()

                # Update error rate
                if self.performance.total_tasks > 0:
                    self.performance.error_rate = (
                        self.performance.failed_tasks / self.performance.total_tasks
                    )

                # Log performance summary
                logger.debug(
                    f"Agent {self.agent_id} performance: "
                    f"success_rate={self.performance.success_rate:.2f}, "
                    f"avg_response_time={self.performance.avg_response_time:.2f}s, "
                    f"total_tasks={self.performance.total_tasks}"
                )

            except Exception as e:
                logger.error(f"Performance tracking failed for {self.agent_id}: {e}")

    async def execute_task(self, task: Task) -> Dict[str, Any]:
        """Execute task with proper lifecycle management"""
        if self.current_task and self.current_task.status == TaskStatus.RUNNING:
            raise RuntimeError(f"Agent {self.agent_id} is already executing a task")

        self.current_task = task
        task.status = TaskStatus.RUNNING
        task.started_at = time.time()
        task.assigned_agent = self.agent_id

        start_time = time.time()

        try:
            # Execute the actual task
            result = await self.process_task(task)

            # Mark as completed
            task.status = TaskStatus.COMPLETED
            task.completed_at = time.time()
            task.result = result

            # Update performance metrics
            self.performance.total_tasks += 1
            self.performance.successful_tasks += 1

            execution_time = time.time() - start_time
            self._update_avg_response_time(execution_time)

            # Store in history
            self.task_history.append(task)

            logger.info(f"Agent {self.agent_id} completed task {task.task_id} in {execution_time:.2f}s")

            return result

        except Exception as e:
            # Mark as failed
            task.status = TaskStatus.FAILED
            task.completed_at = time.time()
            task.error_message = str(e)

            # Update performance metrics
            self.performance.total_tasks += 1
            self.performance.failed_tasks += 1

            # Store in history
            self.task_history.append(task)

            logger.error(f"Agent {self.agent_id} failed task {task.task_id}: {e}")
            raise

        finally:
            self.current_task = None
            self.performance.last_active = time.time()

    async def send_message(
        self, 
        recipient: str, 
        content: Dict[str, Any], 
        priority: int = 0,
        message_type: str = "general",
        requires_response: bool = False
    ) -> Optional[Dict[str, Any]]:
        """Send message to another agent with optional response waiting"""

        message = AgentMessage(
            sender=self.agent_id,
            recipient=recipient,
            content=content,
            priority=priority,
            message_type=message_type,
            requires_response=requires_response
        )

        if requires_response:
            # Create future for response
            response_future = asyncio.Future()
            self.pending_responses[message.id] = response_future
            message.correlation_id = message.id

        # Send to recipient
        if recipient in self._connections:
            target_agent = self._connections[recipient]
            if target_agent and target_agent.state == AgentState.RUNNING:
                try:
                    await target_agent.message_queue.put(message)
                    logger.debug(f"Message sent from {self.agent_id} to {recipient}")

                    if requires_response:
                        # Wait for response with timeout
                        try:
                            response = await asyncio.wait_for(
                                response_future, 
                                timeout=self.message_timeout
                            )
                            return response
                        except asyncio.TimeoutError:
                            logger.warning(f"Response timeout for message from {self.agent_id} to {recipient}")
                            return None
                        finally:
                            self.pending_responses.pop(message.id, None)

                except asyncio.QueueFull:
                    logger.error(f"Message queue full for agent {recipient}")
                    raise RuntimeError(f"Cannot send message to {recipient}: queue full")
            else:
                raise RuntimeError(f"Agent {recipient} not available")
        else:
            raise RuntimeError(f"Agent {recipient} not connected")

    async def _send_response(self, original_message: AgentMessage, response: Dict[str, Any]):
        """Send response to original message sender"""
        if original_message.correlation_id and original_message.sender in self._connections:
            sender_agent = self._connections[original_message.sender]
            if sender_agent and original_message.correlation_id in sender_agent.pending_responses:
                future = sender_agent.pending_responses[original_message.correlation_id]
                if not future.done():
                    future.set_result(response)

    def connect_to_agent(self, agent: 'BaseAgent'):
        """Connect to another agent for communication"""
        self._connections[agent.agent_id] = agent
        agent._connections[self.agent_id] = self
        logger.debug(f"Connected agents {self.agent_id} and {agent.agent_id}")

    def disconnect_from_agent(self, agent_id: str):
        """Disconnect from another agent"""
        if agent_id in self._connections:
            del self._connections[agent_id]
            logger.debug(f"Disconnected agent {self.agent_id} from {agent_id}")

    async def check_health(self) -> Dict[str, Any]:
        """Check agent health status"""
        current_time = time.time()

        # Check if agent is responsive
        queue_size = self.message_queue.qsize()
        last_active_ago = current_time - self.performance.last_active

        status = "healthy"
        issues = []

        # Check queue backlog
        if queue_size > 100:
            status = "degraded"
            issues.append(f"High message queue size: {queue_size}")

        # Check responsiveness
        if last_active_ago > 300:  # 5 minutes
            status = "degraded"
            issues.append(f"No activity for {last_active_ago:.0f} seconds")

        # Check error rate
        if self.performance.error_rate > 0.5:
            status = "critical"
            issues.append(f"High error rate: {self.performance.error_rate:.2f}")

        return {
            "status": status,
            "issues": issues,
            "queue_size": queue_size,
            "last_active_ago": last_active_ago,
            "error_rate": self.performance.error_rate,
            "success_rate": self.performance.success_rate,
            "last_check": current_time
        }

    async def attempt_recovery(self):
        """Attempt to recover from issues"""
        # Clear message queue if too full
        if self.message_queue.qsize() > 500:
            logger.warning(f"Clearing overloaded message queue for agent {self.agent_id}")
            while not self.message_queue.empty():
                try:
                    self.message_queue.get_nowait()
                except asyncio.QueueEmpty:
                    break

        # Reset error counters if needed
        if self.performance.error_rate > 0.8:
            logger.info(f"Resetting error counters for agent {self.agent_id}")
            self.performance.failed_tasks = 0
            self.performance.total_tasks = max(1, self.performance.successful_tasks)

    def _update_avg_response_time(self, response_time: float):
        """Update average response time"""
        if self.performance.total_tasks == 1:
            self.performance.avg_response_time = response_time
        else:
            # Exponential moving average
            alpha = 0.1
            self.performance.avg_response_time = (
                alpha * response_time + 
                (1 - alpha) * self.performance.avg_response_time
            )

    def _update_message_performance(self, processing_time: float):
        """Update message processing performance"""
        # Could track separate metrics for message processing
        pass

    def get_status(self) -> Dict[str, Any]:
        """Get comprehensive agent status"""
        return {
            "agent_id": self.agent_id,
            "state": self.state.value,
            "performance": {
                "total_tasks": self.performance.total_tasks,
                "successful_tasks": self.performance.successful_tasks,
                "failed_tasks": self.performance.failed_tasks,
                "success_rate": self.performance.success_rate,
                "error_rate": self.performance.error_rate,
                "avg_response_time": self.performance.avg_response_time,
                "last_active": self.performance.last_active
            },
            "current_task": self.current_task.task_id if self.current_task else None,
            "queue_size": self.message_queue.qsize(),
            "connections": list(self._connections.keys()),
            "health": self.health_status
        }

    # Abstract methods that subclasses must implement
    @abstractmethod
    async def handle_message(self, message: AgentMessage) -> Optional[Dict[str, Any]]:
        """Handle incoming message"""
        pass

    @abstractmethod
    async def process_task(self, task: Task) -> Dict[str, Any]:
        """Process assigned task"""
        pass

    @abstractmethod
    async def on_start(self):
        """Called when agent starts"""
        pass

    @abstractmethod
    async def on_stop(self):
        """Called when agent stops"""
        pass

class AgentRegistry:
    """Registry for managing multiple agents"""

    def __init__(self):
        self.agents: Dict[str, BaseAgent] = {}
        self.agent_types: Dict[str, type] = {}

    def register_agent_type(self, agent_type: str, agent_class: type):
        """Register an agent type"""
        self.agent_types[agent_type] = agent_class
        logger.info(f"Registered agent type: {agent_type}")

    async def create_agent(self, agent_type: str, agent_id: str, config: Dict[str, Any]) -> BaseAgent:
        """Create and register an agent"""
        if agent_type not in self.agent_types:
            raise ValueError(f"Unknown agent type: {agent_type}")

        if agent_id in self.agents:
            raise ValueError(f"Agent {agent_id} already exists")

        agent_class = self.agent_types[agent_type]
        agent = agent_class(agent_id, config)

        self.agents[agent_id] = agent
        logger.info(f"Created agent {agent_id} of type {agent_type}")

        return agent

    async def start_agent(self, agent_id: str):
        """Start an agent"""
        if agent_id not in self.agents:
            raise ValueError(f"Agent {agent_id} not found")

        await self.agents[agent_id].start()

    async def stop_agent(self, agent_id: str):
        """Stop an agent"""
        if agent_id not in self.agents:
            raise ValueError(f"Agent {agent_id} not found")

        await self.agents[agent_id].stop()

    async def stop_all_agents(self):
        """Stop all agents"""
        tasks = [agent.stop() for agent in self.agents.values()]
        await asyncio.gather(*tasks, return_exceptions=True)

    def get_agent(self, agent_id: str) -> Optional[BaseAgent]:
        """Get agent by ID"""
        return self.agents.get(agent_id)

    def list_agents(self) -> List[str]:
        """List all agent IDs"""
        return list(self.agents.keys())

    def get_agents_by_state(self, state: AgentState) -> List[BaseAgent]:
        """Get agents by state"""
        return [agent for agent in self.agents.values() if agent.state == state]

# Global agent registry
agent_registry = AgentRegistry()

# Define AgentTaskState - Ensure this dataclass is defined
from dataclasses import dataclass, field, asdict

@dataclass
class AgentTaskState:
    """Represents the state of an agent task"""
    task_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    query: str = ""
    status: TaskStatus = TaskStatus.PENDING
    preferences: Dict[str, Any] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)
    plan: Optional[Any] = None  # Replace Any with the actual type if available
    results: List[Any] = field(default_factory=list)  # Replace Any with the actual type if available
    errors: List[str] = field(default_factory=list)
    progress: float = 0.0
    completed_at: Optional[float] = None

# Core agent system
class AgentCore:
    """Core agent management system"""

    def __init__(self):
        self.registry = agent_registry
        self.active_agents = {}  # Track active research tasks
        self.task_results = {}   # Store task results
        self.metrics = {
            "total_agents": 0,
            "active_agents": 0,
            "total_tasks": 0,
            "successful_tasks": 0,
            "failed_tasks": 0
        }

    async def initialize(self):
        """Initialize agent core"""
        logger.info("Agent core initialized")

    async def shutdown(self):
        """Shutdown agent core"""
        await self.registry.stop_all_agents()
        logger.info("Agent core shutdown complete")

    async def create_research_task(self, query: str, preferences: Dict[str, Any] = None) -> str:
        """Create a new research task with planning"""
        task_id = f"task_{int(time.time() * 1000)}"

        try:
            # Initialize task state
            task_state = AgentTaskState(
                task_id=task_id,
                query=query,
                status=TaskStatus.PENDING,
                preferences=preferences or {},
                created_at=time.time()
            )

            self.active_agents[task_id] = task_state

            # Start background task for research
            # Use await to ensure the task is properly created and its ID is returned
            task_id = await asyncio.create_task(self._execute_research_task(task_state))

            logger.info(f"Created research task: {task_id}")


            return task_id

        except Exception as e:
            logger.error(f"Failed to create research task: {e}")
            # Clean up if task creation failed
            if task_id in self.active_agents:
                del self.active_agents[task_id]
            raise

    async def _execute_research_task(self, task_state: AgentTaskState):
        """Execute the research task with planning and execution"""
        try:
            # Save initial state
            self._persist_task_state(task_state)

            task_state.status = TaskStatus.PLANNING
            # Assuming _create_execution_plan is defined elsewhere
            # and returns a plan object
            task_state.plan = await self._create_execution_plan(task_state.query, task_state.preferences)
            self._persist_task_state(task_state)

            task_state.status = TaskStatus.EXECUTING
            task_state.progress = 0.1
            self._persist_task_state(task_state)

            # Execute the plan
            # Assuming task_state.plan.steps is a list of steps to execute
            for i, step in enumerate(task_state.plan.steps):
                try:
                    # Assuming _execute_step is defined elsewhere
                    # and executes a step and returns a result
                    step_result = await self._execute_step(step)
                    task_state.results.append(step_result)
                    task_state.progress = (i + 1) / len(task_state.plan.steps) * 0.8
                    self._persist_task_state(task_state)
                except Exception as e:
                    logger.error(f"Step execution failed: {e}")
                    task_state.errors.append(str(e))
                    self._persist_task_state(task_state)

            task_state.status = TaskStatus.COMPLETED
            task_state.progress = 1.0
            task_state.completed_at = time.time()
            self._persist_task_state(task_state)

            # return the ID when complete
            return task_state.task_id

        except Exception as e:
            task_state.status = TaskStatus.FAILED
            task_state.errors.append(str(e))
            task_state.completed_at = time.time()
            self._persist_task_state(task_state)
            logger.error(f"Task execution failed: {e}")

            # Return the task_id even if it fails
            return task_state.task_id

    def _persist_task_state(self, task_state: AgentTaskState):
        """Persist task state to storage"""
        try:
            import os
            import json

            # Ensure storage directory exists
            os.makedirs("state_storage", exist_ok=True)

            # Save individual task state
            filename = f"state_storage/{task_state.task_id}.json"
            with open(filename, 'w') as f:
                json.dump(asdict(task_state), f, indent=2, default=str)

            logger.debug(f"Persisted task state for {task_state.task_id}")
        except Exception as e:
            logger.error(f"Failed to persist task state: {e}")

    def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get status of a specific task"""
        if task_id not in self.active_agents:
            return None

        agent_data = self.active_agents[task_id]
        task = agent_data["task"]

        return {
            "task_id": task_id,
            "status": agent_data["status"],
            "progress": agent_data["progress"],
            "query": task.query,
            "created_at": task.created_at,
            "started_at": task.started_at,
            "completed_at": task.completed_at,
            "result": task.result,
            "error": agent_data.get("error"),
            "metadata": agent_data["metadata"]
        }

    def cleanup_completed_tasks(self, max_age_hours: int = 24):
        """Clean up completed tasks older than specified hours"""
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600

        tasks_to_remove = []
        for task_id, agent_data in self.active_agents.items():
            task_age = current_time - agent_data["created_at"]
            if (agent_data["status"] in ["completed", "failed"] and 
                task_age > max_age_seconds):
                tasks_to_remove.append(task_id)

        for task_id in tasks_to_remove:
            del self.active_agents[task_id]
            self.task_results.pop(task_id, None)

        logger.info(f"Cleaned up {len(tasks_to_remove)} old tasks")

    def get_system_status(self) -> Dict[str, Any]:
        """Get overall system status"""
        agents = list(self.registry.agents.values())

        # Update metrics
        self.metrics["total_agents"] = len(agents)
        self.metrics["active_agents"] = len([a for a in agents if a.state == AgentState.RUNNING])

        # Aggregate task metrics
        total_tasks = sum(a.performance.total_tasks for a in agents)
        successful_tasks = sum(a.performance.successful_tasks for a in agents)
        failed_tasks = sum(a.performance.failed_tasks for a in agents)

        self.metrics.update({
            "total_tasks": total_tasks,
            "successful_tasks": successful_tasks,
            "failed_tasks": failed_tasks
        })

        return {
            "metrics": self.metrics,
            "agents": {agent.agent_id: agent.get_status() for agent in agents}
        }

    # Define dummy methods to make the code runnable - replace them with actual implementations
    async def _create_execution_plan(self, query: str, preferences: Dict[str, Any]):
        """Create execution plan for the research task"""
        # Replace with actual implementation
        return {"steps": ["step1", "step2"]}

    async def _execute_step(self, step: str):
        """Execute a single step in the execution plan"""
        # Replace with actual implementation
        return f"Result of {step}"

# Global agent core instance
agent_core = AgentCore()