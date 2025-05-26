
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
import asyncio
import json
import time
import logging
from datetime import datetime, timedelta
from dataclasses import dataclass, field

logger = logging.getLogger("enhanced_memory")

@dataclass
class Memory:
    """Memory record structure"""
    id: Optional[int] = None
    agent_id: str = ""
    memory_type: str = ""
    content: str = ""
    embedding: Optional[List[float]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    importance: float = 0.5
    access_count: int = 0
    last_accessed: Optional[datetime] = None
    created_at: Optional[datetime] = None

class VectorMemoryStore:
    """Vector-based memory with semantic search"""
    
    def __init__(self, dimension: int = 768):
        self.dimension = dimension
        self.embeddings = []
        self.memories = []
        self.index = None
        
    async def initialize(self):
        """Initialize vector index"""
        logger.info("Vector memory store initialized")
    
    async def add_memory(
        self, 
        content: str, 
        embedding: np.ndarray, 
        metadata: Dict[str, Any]
    ):
        """Add memory with vector embedding"""
        self.memories.append({
            "content": content,
            "metadata": metadata,
            "timestamp": datetime.now().isoformat()
        })
        self.embeddings.append(embedding)
    
    async def search(
        self, 
        query_embedding: np.ndarray, 
        top_k: int = 5
    ) -> List[Tuple[Dict[str, Any], float]]:
        """Search memories by semantic similarity"""
        if not self.embeddings:
            return []
        
        # Calculate cosine similarities
        embeddings_matrix = np.array(self.embeddings)
        query_norm = query_embedding / np.linalg.norm(query_embedding)
        embeddings_norm = embeddings_matrix / np.linalg.norm(
            embeddings_matrix, axis=1, keepdims=True
        )
        
        similarities = np.dot(embeddings_norm, query_norm)
        
        # Get top-k results
        top_indices = np.argsort(similarities)[-top_k:][::-1]
        
        results = []
        for idx in top_indices:
            if similarities[idx] > 0.7:  # Similarity threshold
                results.append((
                    self.memories[idx],
                    float(similarities[idx])
                ))
        
        return results

class SimpleMemoryStore:
    """Simple in-memory storage fallback"""
    
    def __init__(self):
        self.memories: Dict[str, List[Memory]] = {}
        self.next_id = 1
    
    async def store_memory(
        self,
        agent_id: str,
        memory_type: str,
        content: str,
        embedding: Optional[List[float]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        importance: float = 0.5
    ) -> int:
        """Store a memory"""
        memory = Memory(
            id=self.next_id,
            agent_id=agent_id,
            memory_type=memory_type,
            content=content,
            embedding=embedding,
            metadata=metadata or {},
            importance=importance,
            access_count=0,
            last_accessed=datetime.now(),
            created_at=datetime.now()
        )
        
        if agent_id not in self.memories:
            self.memories[agent_id] = []
        
        self.memories[agent_id].append(memory)
        self.next_id += 1
        
        return memory.id
    
    async def retrieve_memories(
        self,
        agent_id: str,
        memory_type: Optional[str] = None,
        limit: int = 10,
        min_importance: float = 0.0
    ) -> List[Dict[str, Any]]:
        """Retrieve memories for an agent"""
        if agent_id not in self.memories:
            return []
        
        memories = self.memories[agent_id]
        
        # Filter by type and importance
        filtered = []
        for memory in memories:
            if memory_type and memory.memory_type != memory_type:
                continue
            if memory.importance < min_importance:
                continue
            
            # Update access count
            memory.access_count += 1
            memory.last_accessed = datetime.now()
            
            filtered.append({
                "id": memory.id,
                "memory_type": memory.memory_type,
                "content": memory.content,
                "metadata": memory.metadata,
                "importance": memory.importance,
                "access_count": memory.access_count,
                "last_accessed": memory.last_accessed.isoformat(),
                "created_at": memory.created_at.isoformat()
            })
        
        # Sort by importance and access time
        filtered.sort(key=lambda x: (x["importance"], x["access_count"]), reverse=True)
        
        return filtered[:limit]
    
    async def search_memories(
        self,
        agent_id: str,
        query: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Search memories using text search"""
        if agent_id not in self.memories:
            return []
        
        memories = self.memories[agent_id]
        query_lower = query.lower()
        
        # Simple text search
        results = []
        for memory in memories:
            if query_lower in memory.content.lower():
                relevance = memory.content.lower().count(query_lower) / len(memory.content.split())
                
                results.append({
                    "id": memory.id,
                    "memory_type": memory.memory_type,
                    "content": memory.content,
                    "metadata": memory.metadata,
                    "importance": memory.importance,
                    "relevance": relevance
                })
        
        # Sort by relevance and importance
        results.sort(key=lambda x: (x["relevance"], x["importance"]), reverse=True)
        
        return results[:limit]
    
    async def get_memory_stats(self, agent_id: str) -> Dict[str, Any]:
        """Get memory statistics for an agent"""
        if agent_id not in self.memories:
            return {
                "total_memories": 0,
                "memory_types": 0,
                "average_importance": 0.0,
                "last_active": None,
                "type_breakdown": {}
            }
        
        memories = self.memories[agent_id]
        
        type_breakdown = {}
        total_importance = 0
        last_active = None
        
        for memory in memories:
            # Type breakdown
            if memory.memory_type not in type_breakdown:
                type_breakdown[memory.memory_type] = 0
            type_breakdown[memory.memory_type] += 1
            
            # Importance sum
            total_importance += memory.importance
            
            # Last active
            if last_active is None or memory.last_accessed > last_active:
                last_active = memory.last_accessed
        
        return {
            "total_memories": len(memories),
            "memory_types": len(type_breakdown),
            "average_importance": total_importance / len(memories) if memories else 0.0,
            "last_active": last_active.isoformat() if last_active else None,
            "type_breakdown": type_breakdown
        }

class PersistentMemoryManager:
    """Comprehensive memory management system"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.vector_store = VectorMemoryStore()
        self.simple_store = SimpleMemoryStore()
        
        # Memory categories
        self.memory_types = {
            "episodic": "agent_episodic_memory",
            "semantic": "agent_semantic_memory", 
            "procedural": "agent_procedural_memory",
            "working": "agent_working_memory"
        }
        
        # Use simple store as fallback
        self.active_store = self.simple_store
    
    async def initialize(self):
        """Initialize all memory stores"""
        try:
            # Try to initialize advanced stores if available
            await self.vector_store.initialize()
            logger.info("Memory management system initialized")
        except Exception as e:
            logger.warning(f"Using simple memory store: {e}")
    
    async def store_memory(
        self,
        agent_id: str,
        memory_type: str,
        content: str,
        embedding: Optional[np.ndarray] = None,
        metadata: Optional[Dict[str, Any]] = None,
        importance: float = 0.5
    ) -> int:
        """Store a memory"""
        
        # Convert numpy array to list if needed
        embedding_list = embedding.tolist() if embedding is not None else None
        
        # Store in active store
        memory_id = await self.active_store.store_memory(
            agent_id=agent_id,
            memory_type=memory_type,
            content=content,
            embedding=embedding_list,
            metadata=metadata,
            importance=importance
        )
        
        # Add to vector store if embedding provided
        if embedding is not None:
            await self.vector_store.add_memory(content, embedding, metadata or {})
        
        return memory_id
    
    async def retrieve_memories(
        self,
        agent_id: str,
        memory_type: Optional[str] = None,
        limit: int = 10,
        min_importance: float = 0.0
    ) -> List[Dict[str, Any]]:
        """Retrieve memories for an agent"""
        return await self.active_store.retrieve_memories(
            agent_id=agent_id,
            memory_type=memory_type,
            limit=limit,
            min_importance=min_importance
        )
    
    async def search_memories(
        self,
        agent_id: str,
        query: str,
        query_embedding: Optional[np.ndarray] = None,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Search memories using text or semantic search"""
        
        if query_embedding is not None:
            # Try vector search first
            try:
                vector_results = await self.vector_store.search(query_embedding, limit)
                return [result[0] for result in vector_results]
            except:
                pass
        
        # Fallback to text search
        return await self.active_store.search_memories(agent_id, query, limit)
    
    async def consolidate_memories(self, agent_id: str):
        """Consolidate and compress old memories"""
        # Get all memories for agent
        all_memories = await self.retrieve_memories(agent_id, limit=1000)
        
        # Simple consolidation: merge similar memories
        # This is a basic implementation
        logger.info(f"Consolidating {len(all_memories)} memories for agent {agent_id}")
        
        return len(all_memories)
    
    async def get_memory_stats(self, agent_id: str) -> Dict[str, Any]:
        """Get memory statistics for an agent"""
        return await self.active_store.get_memory_stats(agent_id)
    
    async def clear_agent_memories(self, agent_id: str):
        """Clear all memories for an agent"""
        if hasattr(self.active_store, 'memories') and agent_id in self.active_store.memories:
            del self.active_store.memories[agent_id]
            logger.info(f"Cleared memories for agent {agent_id}")
