# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
Enhanced DeerFlow API service for Tongkeeper integration
"""

import argparse
import asyncio
import logging
import os
from typing import Optional, List, Dict, Any

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.graph.builder import build_graph_with_memory

# Build the graph at startup
graph = build_graph_with_memory()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    filename="deerflow.log",
    filemode="a",
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="DeerFlow Research API",
    description="Enhanced research capabilities for Tongkeeper AI",
    version="0.1.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.get("/")
async def root():
    """Root endpoint returning service information."""
    return {
        "service": "DeerFlow Research API",
        "version": "0.1.0",
        "status": "operational"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "healthy"}

class ResearchRequest:
    def __init__(
        self,
        query: str,
        max_plan_iterations: int = 1,
        max_step_num: int = 3,
        enable_background_investigation: bool = True,
        conversation_id: Optional[str] = None,
    ):
        self.query = query
        self.max_plan_iterations = max_plan_iterations
        self.max_step_num = max_step_num
        self.enable_background_investigation = enable_background_investigation
        self.conversation_id = conversation_id

@app.post("/api/research")
async def research(request: Request):
    """Run research on a specific topic or query using DeerFlow."""
    try:
        data = await request.json()
        query = data.get("query")
        
        if not query:
            raise HTTPException(status_code=400, detail="Query parameter is required")
        
        # Extract optional parameters with defaults
        max_plan_iterations = data.get("max_plan_iterations", 1)
        max_step_num = data.get("max_step_num", 3)
        enable_background_investigation = data.get("enable_background_investigation", True)
        conversation_id = data.get("conversation_id")
        
        logger.info(f"Processing research request: {query}")
        
        # Create a research request object
        research_request = ResearchRequest(
            query=query,
            max_plan_iterations=max_plan_iterations,
            max_step_num=max_step_num,
            enable_background_investigation=enable_background_investigation,
            conversation_id=conversation_id,
        )
        
        # Process the research asynchronously
        result = await process_research_request(research_request)
        
        return JSONResponse(content=result)
    except Exception as e:
        logger.exception(f"Error processing research request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Research processing error: {str(e)}")

async def process_research_request(request: ResearchRequest) -> Dict[str, Any]:
    """Process a research request using DeerFlow's agent workflow."""
    try:
        # Create a custom collector for the results
        collected_messages = []
        final_report = ""
        sources = []
        observations = []
        plan = {}
        
        # Setup an event loop for processing
        async def collect_output():
            nonlocal final_report, sources, plan, observations
            
            # Call DeerFlow's agent workflow with message capturing
            async for state in graph.astream(
                input={
                    "messages": [{"role": "user", "content": request.query}],
                    "auto_accepted_plan": True,
                    "enable_background_investigation": request.enable_background_investigation,
                },
                config={
                    "configurable": {
                        "thread_id": request.conversation_id or "default",
                        "max_plan_iterations": request.max_plan_iterations,
                        "max_step_num": request.max_step_num,
                    },
                    "recursion_limit": 100,
                },
                stream_mode="values"
            ):
                # Process each state update
                if isinstance(state, dict):
                    # Capture messages
                    if "messages" in state and state["messages"]:
                        collected_messages.extend(state["messages"])
                    
                    # Capture final report if available
                    if "final_report" in state:
                        final_report = state["final_report"]
                    
                    # Capture sources if available
                    if "sources" in state:
                        sources = state["sources"]
                    
                    # Capture plan if available
                    if "current_plan" in state and state["current_plan"]:
                        plan = state["current_plan"]
                    
                    # Capture observations if available
                    if "observations" in state:
                        observations = state["observations"]
        
        # Run the collection process
        await collect_output()
        
        # Extract the final result from collected messages
        if not final_report and collected_messages:
            # Try to find the last assistant message with content
            for msg in reversed(collected_messages):
                if isinstance(msg, dict) and msg.get("role") == "assistant" and msg.get("content"):
                    final_report = msg["content"]
                    break
        
        # Return the processed result
        return {
            "query": request.query,
            "result": final_report,
            "sources": sources,
            "plan": plan,
            "observations": observations,
            "conversation_id": request.conversation_id,
            "collected_messages": collected_messages[-5:] if collected_messages else []  # Return last 5 messages for context
        }
    except Exception as e:
        logger.exception(f"Error in research processing: {str(e)}")
        return {
            "query": request.query,
            "error": str(e),
            "conversation_id": request.conversation_id,
        }

if __name__ == "__main__":
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Run the DeerFlow API server")
    parser.add_argument(
        "--host",
        type=str,
        default="0.0.0.0",
        help="Host to bind the server to (default: 0.0.0.0)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port to bind the server to (default: 8000)",
    )
    parser.add_argument(
        "--log-level",
        type=str,
        default="info",
        choices=["debug", "info", "warning", "error", "critical"],
        help="Log level (default: info)",
    )

    args = parser.parse_args()

    logger.info("Starting DeerFlow Research API server")
    uvicorn.run(
        "main:app",
        host=args.host,
        port=args.port,
        reload=False,
        log_level=args.log_level,
    )