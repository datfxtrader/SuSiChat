# deerflow_service/server.py
import os
import asyncio
from fastapi import FastAPI
from pydantic import BaseModel, Field
import uvicorn
from typing import Optional, List, Dict, Any

# Import DeerFlow modules - will be installed from requirements.txt
# from deerflow import DeerFlowResearcher

app = FastAPI()

class ResearchRequest(BaseModel):
    research_question: str
    model_id: Optional[str] = "deepseek-v3"
    include_market_data: Optional[bool] = True
    include_news: Optional[bool] = True
    # external_context: Optional[List[Dict[str, Any]]] = None # Future use

class ResearchResponse(BaseModel):
    status: Optional[Dict[str, Any]] = None
    report: Optional[str] = None
    visualization_path: Optional[str] = None
    timestamp: Optional[str] = None
    sources: Optional[List[Dict[str, Any]]] = None
    service_process_log: Optional[List[str]] = Field(default_factory=list)

# Will be initialized in startup event
researcher = None
DEFAULT_MODEL_ID_FOR_INIT = "deepseek-v3"

@app.on_event("startup")
async def startup_event():
    global researcher
    print("DeerFlow Service starting up...")
    print("Checking for required environment variables:")
    required_keys = ["OPENAI_API_KEY", "TAVILY_API_KEY", "DEEPSEEK_API_KEY"]
    for key in required_keys:
        print(f"  - {key}: {'Available' if key in os.environ else 'MISSING'}")
    
    # TODO: Initialize DeerFlow when we have the actual package installed
    # For now, we'll mock the researcher for development purposes
    print("DeerFlow researcher initialization temporarily mocked for development")
    # try:
    #     researcher = DeerFlowResearcher(model_id=DEFAULT_MODEL_ID_FOR_INIT)
    #     print(f"DeerFlow Researcher initialized successfully with model: {DEFAULT_MODEL_ID_FOR_INIT}")
    # except Exception as e:
    #     print(f"CRITICAL: Error initializing DeerFlow Researcher: {e}")
    #     researcher = None
    researcher = True  # Temporary mock for development

@app.get("/health")
async def health_check():
    if researcher:
        return {"status": "ok", "message": "DeerFlow service is healthy and researcher is initialized."}
    else:
        return {"status": "error", "message": "DeerFlow researcher NOT INITIALIZED."}

@app.post("/research", response_model=ResearchResponse)
async def perform_research_endpoint(request: ResearchRequest):
    service_log = [f"Received research request for: '{request.research_question}'"]
    
    if not researcher:
        error_msg = "Failed: DeerFlow researcher not initialized."
        print(error_msg)
        service_log.append(error_msg)
        return ResearchResponse(report="Error: DeerFlow researcher not initialized.", service_process_log=service_log)

    service_log.append(f"Processing with DeerFlow. Model: {request.model_id}, Market Data: {request.include_market_data}, News: {request.include_news}")
    print(f"Processing with DeerFlow. Question: '{request.research_question}', Model: {request.model_id}")

    try:
        # TODO: Replace with actual DeerFlow research call
        # For now, we'll simulate a research response for development
        await asyncio.sleep(2)  # Simulate processing time
        
        # Mock research output
        mock_report = f"""# Research Report: {request.research_question}

## Summary
This is a sample research report generated for the query: "{request.research_question}"

## Key Findings
1. Finding one with supporting evidence
2. Finding two with supporting evidence
3. Finding three with supporting evidence

## Sources
1. [Example Source 1](https://example.com/source1)
2. [Example Source 2](https://example.com/source2)
"""
        
        mock_sources = [
            {"title": "Example Source 1", "url": "https://example.com/source1", "domain": "example.com"},
            {"title": "Example Source 2", "url": "https://example.com/source2", "domain": "example.com"}
        ]
        
        service_log.append("Research processing completed")
        
        response_data = {
            "status": {"complete": True},
            "report": mock_report,
            "visualization_path": None,
            "timestamp": "2023-05-20T10:30:00",
            "sources": mock_sources,
            "service_process_log": service_log
        }
        return ResearchResponse(**response_data)

    except Exception as e:
        error_message = f"Error during DeerFlow research execution: {type(e).__name__} - {e}"
        print(error_message)
        service_log.append(error_message)
        return ResearchResponse(report=f"An error occurred: {error_message}", service_process_log=service_log)

if __name__ == "__main__":
    print("Starting DeerFlow FastAPI server on port 8765...")
    uvicorn.run(app, host="0.0.0.0", port=8765, log_level="info")