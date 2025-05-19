#!/usr/bin/env python3
"""
DeerFlow Service

This service acts as a bridge between our Node.js application and the DeerFlow research framework.
It exposes a simple REST API that the Node.js adapter can communicate with.
"""

import os
import sys
import json
import asyncio
import logging
from typing import Dict, List, Optional, Union, Any
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import uuid
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="DeerFlow Research Service")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for research tasks (replace with a database in production)
research_tasks = {}

# Define data models
class ResearchRequest(BaseModel):
    query: str
    depth: str = Field(default="standard", description="Research depth level: basic, standard, or deep")
    max_sources: int = Field(default=5, description="Maximum number of sources to include")
    include_domains: List[str] = Field(default=[], description="Domains to prioritize")
    exclude_domains: List[str] = Field(default=[], description="Domains to exclude")
    use_cache: bool = Field(default=True, description="Whether to use cached results")
    user_context: Optional[str] = Field(default=None, description="Additional context from the user")

class Source(BaseModel):
    title: str
    url: str
    domain: str
    content_snippet: Optional[str] = None
    relevance_score: Optional[float] = None

class ResearchResponse(BaseModel):
    id: str
    query: str
    summary: str
    sources: List[Source]
    insights: List[str]
    related_topics: Optional[List[str]] = None
    status: str  # 'completed', 'in_progress', 'failed'
    error: Optional[str] = None
    created_at: str
    updated_at: str

# Mock for DeerFlow interaction (replace with actual DeerFlow integration)
async def run_deerflow_research(request_id: str, request: ResearchRequest):
    """
    Simulate running a DeerFlow research task
    In a real implementation, this would call the DeerFlow Python SDK
    """
    try:
        # Update task status to in_progress
        research_tasks[request_id]["status"] = "in_progress"
        
        # Simulate processing time based on depth
        processing_time = {
            "basic": 3,
            "standard": 6,
            "deep": 10
        }.get(request.depth, 5)
        
        logger.info(f"Processing research {request_id} for {processing_time} seconds")
        await asyncio.sleep(processing_time)
        
        # In a real implementation, this is where we would call the DeerFlow SDK
        # from deerflow import DeepResearch
        # research = DeepResearch()
        # result = await research.run(
        #     query=request.query,
        #     depth=request.depth,
        #     max_sources=request.max_sources,
        #     ...
        # )
        
        # For now, generate mock data
        sources = [
            Source(
                title=f"Source {i} for {request.query}",
                url=f"https://example.com/article-{i}",
                domain="example.com",
                content_snippet=f"Relevant information about {request.query}...",
                relevance_score=0.9 - (i * 0.1)
            )
            for i in range(1, request.max_sources + 1)
        ]
        
        insights = [
            f"Key insight 1 about {request.query}",
            f"Key insight 2 about {request.query}",
            f"Key insight 3 about {request.query}"
        ]
        
        # Update the task with results
        research_tasks[request_id].update({
            "summary": f"Comprehensive research summary for: {request.query}",
            "sources": [s.dict() for s in sources],
            "insights": insights,
            "related_topics": [f"Related to {request.query} 1", f"Related to {request.query} 2"],
            "status": "completed",
            "updated_at": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in research task {request_id}: {str(e)}")
        research_tasks[request_id].update({
            "status": "failed",
            "error": str(e),
            "updated_at": datetime.now().isoformat()
        })

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

@app.post("/research", response_model=Dict[str, str])
async def create_research(request: ResearchRequest, background_tasks: BackgroundTasks):
    """Create a new research task"""
    request_id = str(uuid.uuid4())
    
    # Initialize the research task
    research_tasks[request_id] = {
        "id": request_id,
        "query": request.query,
        "summary": "",
        "sources": [],
        "insights": [],
        "related_topics": [],
        "status": "in_progress",
        "error": None,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    
    # Run the research task in the background
    background_tasks.add_task(run_deerflow_research, request_id, request)
    
    return {"id": request_id}

@app.get("/research/{research_id}", response_model=ResearchResponse)
async def get_research_status(research_id: str):
    """Get the status of a research task"""
    if research_id not in research_tasks:
        raise HTTPException(status_code=404, detail="Research task not found")
    
    return research_tasks[research_id]

@app.delete("/research/{research_id}")
async def cancel_research(research_id: str):
    """Cancel a research task"""
    if research_id not in research_tasks:
        raise HTTPException(status_code=404, detail="Research task not found")
    
    # In a real implementation, we would also need to cancel the actual DeerFlow task
    research_tasks[research_id]["status"] = "failed"
    research_tasks[research_id]["error"] = "Cancelled by user"
    research_tasks[research_id]["updated_at"] = datetime.now().isoformat()
    
    return {"status": "cancelled"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("deerflow-service:app", host="0.0.0.0", port=port, reload=True)