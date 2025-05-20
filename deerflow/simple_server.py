"""
Simple DeerFlow API server for deep research capabilities
"""

import os
import sys
import json
import time
import logging
import argparse
import uuid
from typing import Dict, List, Optional, Any, Union

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="DeerFlow Research API",
    description="API for DeerFlow deep research capabilities",
    version="0.1.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Task storage
research_tasks = {}

# Request and response models
class Source(BaseModel):
    title: str
    url: str
    domain: str
    contentSnippet: Optional[str] = None
    relevanceScore: Optional[float] = None

class ResearchRequest(BaseModel):
    query: str
    depth: str = "standard"  # basic, standard, deep
    maxSources: int = 5
    includeDomains: Optional[List[str]] = None
    excludeDomains: Optional[List[str]] = None
    useCache: bool = True
    userContext: Optional[str] = None

class ResearchResponse(BaseModel):
    id: str
    query: str
    summary: Optional[str] = None
    sources: List[Source] = []
    insights: List[str] = []
    relatedTopics: Optional[List[str]] = None
    status: str = "in_progress"  # completed, in_progress, analyzing, synthesizing, failed
    error: Optional[str] = None
    createdAt: Optional[str] = None
    completedAt: Optional[str] = None


# Perform research
def perform_research(task_id: str, request: ResearchRequest):
    """Execute research process in the background"""
    try:
        # Update task status to in progress
        research_tasks[task_id]["status"] = "in_progress"
        
        # Simulate processing time based on depth
        if request.depth == "basic":
            processing_time = 2
        elif request.depth == "standard":
            processing_time = 4
        else:  # deep
            processing_time = 8
        
        # Update to analyzing state
        research_tasks[task_id]["status"] = "analyzing"
        time.sleep(processing_time / 2)
        
        # Update to synthesizing state
        research_tasks[task_id]["status"] = "synthesizing"
        time.sleep(processing_time / 2)
        
        # Generate sources based on the query
        sources = []
        domains = ["example.com", "research.org", "scholar.edu", "news.com", "reference.info"]
        
        # Number of sources based on depth
        num_sources = 3
        if request.depth == "standard":
            num_sources = 5
        elif request.depth == "deep":
            num_sources = 10
        
        for i in range(min(num_sources, request.maxSources)):
            sources.append(Source(
                title=f"Research source {i+1} for {request.query}",
                url=f"https://{domains[i % len(domains)]}/article-{i+1}",
                domain=domains[i % len(domains)],
                contentSnippet=f"This is a snippet of content from source {i+1} related to {request.query}...",
                relevanceScore=0.9 - (i * 0.05)
            ))
        
        # Generate insights based on depth
        insights = [
            f"Key insight 1 about {request.query}",
            f"Important finding 2 regarding {request.query}"
        ]
        
        if request.depth in ["standard", "deep"]:
            insights.append(f"Additional insight 3 on {request.query}")
            insights.append(f"Context analysis 4 for {request.query}")
        
        if request.depth == "deep":
            insights.append(f"Advanced correlation 5 in {request.query}")
            insights.append(f"Expert perspective 6 on {request.query}")
        
        # Generate related topics
        related_topics = [
            f"Related topic 1 to {request.query}",
            f"Alternative perspective on {request.query}",
            f"Wider context for {request.query}"
        ]
        
        # Generate summary based on depth
        summary = f"Brief summary of findings about {request.query}."
        if request.depth == "standard":
            summary = f"Comprehensive summary of research findings about {request.query}, including key insights and important context."
        elif request.depth == "deep":
            summary = f"In-depth analysis and synthesis of {request.query} with multiple perspectives, historical context, and future implications based on comprehensive research."
        
        # Update task with completed results
        research_tasks[task_id].update({
            "status": "completed",
            "summary": summary,
            "sources": sources,
            "insights": insights,
            "relatedTopics": related_topics,
            "completedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        })
        
    except Exception as e:
        logger.exception(f"Error performing research: {str(e)}")
        research_tasks[task_id].update({
            "status": "failed",
            "error": str(e)
        })


# API routes
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}


@app.post("/api/research/start")
async def start_research(request: ResearchRequest):
    """Start a new research task"""
    task_id = str(uuid.uuid4())
    
    # Initialize task
    research_tasks[task_id] = {
        "id": task_id,
        "query": request.query,
        "status": "in_progress",
        "sources": [],
        "insights": [],
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }
    
    # Start research in background (in a real implementation, this would be async)
    # For demo, we'll just start it in a separate thread or process
    import threading
    thread = threading.Thread(target=perform_research, args=(task_id, request))
    thread.daemon = True
    thread.start()
    
    return {"id": task_id, "status": "in_progress"}


@app.get("/api/research/{task_id}")
async def get_research_status(task_id: str):
    """Get the status of a research task"""
    if task_id not in research_tasks:
        raise HTTPException(status_code=404, detail=f"Research task {task_id} not found")
    
    return research_tasks[task_id]


@app.post("/api/research/complete")
async def complete_research(request: ResearchRequest):
    """Run a complete research task and wait for completion"""
    task_id = str(uuid.uuid4())
    
    # Initialize task
    research_tasks[task_id] = {
        "id": task_id,
        "query": request.query,
        "status": "in_progress",
        "sources": [],
        "insights": [],
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }
    
    # Perform research synchronously for this endpoint
    perform_research(task_id, request)
    
    return research_tasks[task_id]


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the DeerFlow Research API server")
    parser.add_argument(
        "--host",
        type=str,
        default="0.0.0.0",  # Changed to 0.0.0.0 to make it accessible from outside
        help="Host to bind the server to (default: 0.0.0.0)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8765,
        help="Port to bind the server to (default: 8765)",
    )
    parser.add_argument(
        "--log-level",
        type=str,
        default="info",
        choices=["debug", "info", "warning", "error", "critical"],
        help="Log level (default: info)",
    )

    args = parser.parse_args()

    logger.info(f"Starting DeerFlow Research API server on {args.host}:{args.port}")
    uvicorn.run(
        "simple_server:app",
        host=args.host,
        port=args.port,
        log_level=args.log_level,
    )