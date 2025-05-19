"""
DeerFlow Research Service

This service provides a FastAPI-based interface for deep research functionality.
It integrates with the Tongkeeper application to provide enhanced research capabilities.
"""

import os
import asyncio
import json
import logging
import random
import time
from typing import Dict, List, Optional, Union, Any
from datetime import datetime
import uuid

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="DeerFlow Research Service")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for research tasks
research_tasks = {}

# Models
class ResearchRequest(BaseModel):
    query: str
    depth: Optional[str] = "standard"  # "basic", "standard", or "deep"
    max_sources: Optional[int] = 5
    include_domains: Optional[List[str]] = None
    exclude_domains: Optional[List[str]] = None
    use_cache: Optional[bool] = True
    user_context: Optional[str] = None
    
class Source(BaseModel):
    title: str
    url: str
    domain: str
    content_snippet: Optional[str] = None
    relevance_score: Optional[float] = None

class ResearchResponse(BaseModel):
    id: str
    query: str
    summary: Optional[str] = None
    sources: List[Source] = []
    insights: List[str] = []
    related_topics: Optional[List[str]] = None
    status: str  # "completed", "in_progress", "analyzing", "synthesizing", "failed"
    error: Optional[str] = None
    created_at: Optional[str] = None
    completed_at: Optional[str] = None

# Helper functions for simulated research
def _generate_simulated_sources(query: str, count: int = 5) -> List[Source]:
    """Generate simulated research sources for testing."""
    domains = [
        "wikipedia.org", "britannica.com", "khanacademy.org", 
        "nature.com", "science.org", "researchgate.net",
        "academia.edu", "jstor.org", "scholar.google.com",
        "mit.edu", "stanford.edu", "harvard.edu"
    ]
    
    sources = []
    for i in range(count):
        domain = random.choice(domains)
        title = f"Research on {query.capitalize()}: Part {i+1}"
        url = f"https://{domain}/research/{query.replace(' ', '-').lower()}-{i+1}"
        
        source = Source(
            title=title,
            url=url,
            domain=domain,
            content_snippet=f"This is a comprehensive analysis of {query}. The research explores various aspects including theoretical frameworks, practical applications, and critical perspectives on the subject matter.",
            relevance_score=random.uniform(0.7, 0.95)
        )
        sources.append(source)
    
    return sources

def _generate_simulated_insights(query: str, count: int = 3) -> List[str]:
    """Generate simulated research insights for testing."""
    insights = [
        f"Analysis shows that {query} has significant implications for future developments in this field.",
        f"Research indicates that {query} is influenced by multiple factors, including social, economic, and technological considerations.",
        f"Comparative studies reveal that {query} exhibits different patterns depending on the context and methodology used.",
        f"The literature suggests that {query} is an evolving concept with roots in several theoretical traditions.",
        f"Recent advancements in understanding {query} point to new opportunities for practical applications."
    ]
    
    return random.sample(insights, min(count, len(insights)))

def _generate_simulated_summary(query: str) -> str:
    """Generate a simulated research summary for testing."""
    return f"""
    This comprehensive analysis of {query} reveals several key insights. The research draws on multiple sources across academic and professional domains, synthesizing diverse perspectives.
    
    The findings indicate that {query} is a complex and multifaceted subject with implications across various contexts. The literature shows both consensus on fundamental aspects and divergent views on specialized applications.
    
    Further research could explore additional dimensions, particularly regarding emerging trends and potential future developments in this area.
    """

def _generate_simulated_related_topics(query: str, count: int = 5) -> List[str]:
    """Generate simulated related topics for testing."""
    base_topics = [
        "theoretical frameworks", "practical applications", "historical context",
        "case studies", "comparative analysis", "future trends", "ethical considerations",
        "economic impact", "social implications", "technological aspects",
        "research methodologies", "critical perspectives"
    ]
    
    topics = [f"{query} {topic}" for topic in random.sample(base_topics, min(count, len(base_topics)))]
    return topics

# API Routes
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

@app.post("/research", response_model=Dict[str, str])
async def start_research(request: ResearchRequest):
    """Start a new research task."""
    task_id = str(uuid.uuid4())
    
    # Create initial task state
    research_tasks[task_id] = {
        "id": task_id,
        "query": request.query,
        "status": "in_progress",
        "created_at": datetime.now().isoformat(),
        "request": request.dict()
    }
    
    # Start research task in background
    asyncio.create_task(_process_research_task(task_id))
    
    return {"id": task_id, "status": "in_progress"}

@app.get("/research/{task_id}", response_model=ResearchResponse)
async def get_research_status(task_id: str):
    """Get the status of a research task."""
    if task_id not in research_tasks:
        raise HTTPException(status_code=404, detail="Research task not found")
    
    return research_tasks[task_id]

@app.post("/research/complete", response_model=ResearchResponse)
async def run_complete_research(request: ResearchRequest):
    """Run a complete research task (start and wait for completion)."""
    task_id = str(uuid.uuid4())
    
    # Create initial task state
    research_tasks[task_id] = {
        "id": task_id,
        "query": request.query,
        "status": "in_progress",
        "created_at": datetime.now().isoformat(),
        "request": request.dict()
    }
    
    # Process research task synchronously
    await _process_research_task(task_id, True)
    
    return research_tasks[task_id]

async def _process_research_task(task_id: str, is_synchronous: bool = False):
    """Process a research task asynchronously or synchronously."""
    try:
        # Get the task
        task = research_tasks[task_id]
        request_data = task["request"]
        query = request_data["query"]
        max_sources = request_data.get("max_sources", 5)
        depth = request_data.get("depth", "standard")
        
        # Determine processing time based on depth
        if depth == "basic":
            process_time = 1  # 1 second for basic
        elif depth == "deep":
            process_time = 3  # 3 seconds for deep
        else:  # standard
            process_time = 2  # 2 seconds for standard
            
        # Update status to analyzing
        research_tasks[task_id]["status"] = "analyzing"
        
        if not is_synchronous:
            # Simulate analysis time
            await asyncio.sleep(process_time)
        else:
            # For synchronous calls, use a shorter time
            await asyncio.sleep(min(process_time, 1))
        
        # Update status to synthesizing
        research_tasks[task_id]["status"] = "synthesizing"
        
        if not is_synchronous:
            # Simulate synthesis time
            await asyncio.sleep(process_time)
        else:
            # For synchronous calls, use a shorter time
            await asyncio.sleep(min(process_time, 1))
        
        # Generate results based on depth
        source_count = 3 if depth == "basic" else (8 if depth == "deep" else 5)
        source_count = min(source_count, max_sources)
        
        insight_count = 2 if depth == "basic" else (5 if depth == "deep" else 3)
        related_topics_count = 3 if depth == "basic" else (7 if depth == "deep" else 5)
        
        # Create results
        research_tasks[task_id].update({
            "sources": _generate_simulated_sources(query, source_count),
            "insights": _generate_simulated_insights(query, insight_count),
            "summary": _generate_simulated_summary(query),
            "related_topics": _generate_simulated_related_topics(query, related_topics_count),
            "status": "completed",
            "completed_at": datetime.now().isoformat()
        })
        
        logger.info(f"Research task {task_id} completed")
        
    except Exception as e:
        logger.error(f"Error processing research task {task_id}: {str(e)}")
        research_tasks[task_id].update({
            "status": "failed",
            "error": str(e),
            "completed_at": datetime.now().isoformat()
        })

# Clean up old tasks periodically
@app.on_event("startup")
async def startup_event():
    """Task to clean up old research tasks."""
    asyncio.create_task(_clean_old_tasks())

async def _clean_old_tasks():
    """Clean up old research tasks periodically."""
    while True:
        try:
            now = datetime.now()
            to_delete = []
            
            for task_id, task in research_tasks.items():
                # Parse the timestamp
                if "created_at" in task:
                    created_at = datetime.fromisoformat(task["created_at"])
                    age_hours = (now - created_at).total_seconds() / 3600
                    
                    # Delete tasks older than 24 hours
                    if age_hours > 24:
                        to_delete.append(task_id)
            
            # Delete old tasks
            for task_id in to_delete:
                del research_tasks[task_id]
                
            if to_delete:
                logger.info(f"Cleaned up {len(to_delete)} old research tasks")
                
        except Exception as e:
            logger.error(f"Error cleaning old tasks: {str(e)}")
            
        # Check every 1 hour
        await asyncio.sleep(3600)

# Run the server
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)