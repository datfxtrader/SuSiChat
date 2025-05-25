
import asyncio
import logging
import time
from typing import Set, Dict, Any, Optional, Callable
from contextlib import asynccontextmanager

logger = logging.getLogger("task_manager")

class TaskManager:
    """Manages async tasks with proper lifecycle handling"""
    
    def __init__(self):
        self.tasks: Set[asyncio.Task] = set()
        self.task_registry: Dict[str, asyncio.Task] = {}
    
    async def create_managed_task(
        self, 
        coro, 
        task_id: str,
        timeout: Optional[float] = None
    ) -> asyncio.Task:
        """Create a managed task with proper error handling"""
        task = asyncio.create_task(self._wrapped_task(coro, task_id, timeout))
        self.tasks.add(task)
        self.task_registry[task_id] = task
        task.add_done_callback(lambda t: self.tasks.discard(t))
        return task
    
    async def _wrapped_task(self, coro, task_id: str, timeout: Optional[float]):
        """Wrap task with timeout and error handling"""
        try:
            if timeout:
                return await asyncio.wait_for(coro, timeout)
            return await coro
        except asyncio.TimeoutError:
            logger.error(f"Task {task_id} timed out after {timeout}s")
            raise
        except Exception as e:
            logger.error(f"Task {task_id} failed: {e}")
            raise
        finally:
            self.task_registry.pop(task_id, None)
    
    async def cancel_task(self, task_id: str) -> bool:
        """Cancel a specific task"""
        task = self.task_registry.get(task_id)
        if task and not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                logger.info(f"Task {task_id} cancelled successfully")
                return True
        return False
    
    async def shutdown(self):
        """Gracefully shutdown all tasks"""
        for task in self.tasks:
            if not task.done():
                task.cancel()
        
        await asyncio.gather(*self.tasks, return_exceptions=True)
        self.tasks.clear()
        self.task_registry.clear()
