
"""
Shared types and enums for the DeerFlow agent system

This module contains shared data structures to avoid circular imports.
"""

from dataclasses import dataclass, asdict
from enum import Enum
from typing import Dict, List, Any, Optional
from datetime import datetime

class TaskStatus(Enum):
    PENDING = "pending"
    PLANNING = "planning"
    EXECUTING = "executing"
    REASONING = "reasoning"
    COMPLETED = "completed"
    FAILED = "failed"

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
