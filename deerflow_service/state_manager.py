
import json
import logging
import time
import pickle
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from dataclasses import asdict
from shared_types import AgentState, TaskStatus

logger = logging.getLogger("state_manager")

class StateStore:
    """In-memory state store with file persistence fallback"""
    
    def __init__(self, persist_path: str = "state_storage"):
        self.persist_path = persist_path
        self.local_cache: Dict[str, Any] = {}
        self.cache_ttl = 300  # 5 minutes
        self._ensure_storage_dir()
    
    def _ensure_storage_dir(self):
        """Ensure storage directory exists"""
        import os
        if not os.path.exists(self.persist_path):
            os.makedirs(self.persist_path)
    
    async def connect(self):
        """Initialize state store"""
        logger.info("State store initialized")
    
    async def disconnect(self):
        """Cleanup state store"""
        logger.info("State store disconnected")
    
    async def save_state(self, task_id: str, state: AgentState, ttl: int = 86400):
        """Save state with TTL (default 24 hours)"""
        try:
            # Serialize state
            state_dict = asdict(state)
            
            # Save to local cache
            self.local_cache[task_id] = {
                "state": state_dict,
                "expires": datetime.now() + timedelta(seconds=self.cache_ttl),
                "created": time.time()
            }
            
            # Persist to file
            import os
            file_path = os.path.join(self.persist_path, f"{task_id}.json")
            with open(file_path, 'w') as f:
                json.dump(state_dict, f, indent=2, default=str)
            
            logger.debug(f"State saved for task {task_id}")
            
        except Exception as e:
            logger.error(f"Failed to save state for {task_id}: {e}")
            raise
    
    async def get_state(self, task_id: str) -> Optional[AgentState]:
        """Retrieve state with caching"""
        # Check local cache first
        cached = self.local_cache.get(task_id)
        if cached and cached["expires"] > datetime.now():
            state_dict = cached["state"]
            return AgentState(**state_dict)
        
        # Try to load from file
        try:
            import os
            file_path = os.path.join(self.persist_path, f"{task_id}.json")
            if os.path.exists(file_path):
                with open(file_path, 'r') as f:
                    state_dict = json.load(f)
                
                # Convert status back to enum
                if 'status' in state_dict:
                    state_dict['status'] = TaskStatus(state_dict['status'])
                
                state = AgentState(**state_dict)
                
                # Update cache
                self.local_cache[task_id] = {
                    "state": state_dict,
                    "expires": datetime.now() + timedelta(seconds=self.cache_ttl)
                }
                
                return state
        except Exception as e:
            logger.error(f"Failed to retrieve state for {task_id}: {e}")
        
        return None
    
    async def delete_state(self, task_id: str):
        """Delete state from storage"""
        import os
        file_path = os.path.join(self.persist_path, f"{task_id}.json")
        if os.path.exists(file_path):
            os.remove(file_path)
        self.local_cache.pop(task_id, None)

class StateTransitionValidator:
    """Validates state transitions"""
    
    VALID_TRANSITIONS = {
        TaskStatus.PENDING: [TaskStatus.PLANNING, TaskStatus.FAILED],
        TaskStatus.PLANNING: [TaskStatus.EXECUTING, TaskStatus.FAILED],
        TaskStatus.EXECUTING: [TaskStatus.REASONING, TaskStatus.COMPLETED, TaskStatus.FAILED],
        TaskStatus.REASONING: [TaskStatus.COMPLETED, TaskStatus.FAILED],
        TaskStatus.COMPLETED: [],
        TaskStatus.FAILED: []
    }
    
    @classmethod
    def validate_transition(cls, from_status: TaskStatus, to_status: TaskStatus) -> bool:
        """Check if state transition is valid"""
        return to_status in cls.VALID_TRANSITIONS.get(from_status, [])
    
    @classmethod
    def transition_state(cls, state: AgentState, new_status: TaskStatus) -> AgentState:
        """Safely transition state"""
        if not cls.validate_transition(state.status, new_status):
            raise ValueError(
                f"Invalid transition from {state.status} to {new_status}"
            )
        
        state.status = new_status
        state.metadata["last_transition"] = datetime.now().isoformat()
        
        return state
