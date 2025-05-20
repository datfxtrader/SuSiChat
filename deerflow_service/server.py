"""
DeerFlow Research Service

This service provides a FastAPI server to handle deep research requests using DeerFlow.
"""
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from typing import Optional, List, Dict, Any
import os
import asyncio
import requests
import json
import logging
import time
import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("deerflow.log")
    ]
)
logger = logging.getLogger("deerflow_service")

# Initialize FastAPI app
app = FastAPI(title="DeerFlow Research Service")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define request/response models
class ResearchRequest(BaseModel):
    research_question: str
    model_id: Optional[str] = "deepseek-v3"
    include_market_data: Optional[bool] = True
    include_news: Optional[bool] = True

class ResearchResponse(BaseModel):
    status: Optional[Dict[str, Any]] = None
    report: Optional[str] = None
    visualization_path: Optional[str] = None
    timestamp: Optional[str] = None
    sources: Optional[List[Dict[str, Any]]] = None
    service_process_log: Optional[List[str]] = []

# Global variables
research_state = {}
TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY")
BRAVE_API_KEY = os.environ.get("BRAVE_API_KEY")
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY")

# Helper functions for research
async def search_web(query: str, max_results: int = 8):
    """Search the web using available search engines."""
    logger.info(f"Searching web for: {query}")
    
    # First try Tavily if available
    if TAVILY_API_KEY:
        try:
            return await search_tavily(query, max_results)
        except Exception as e:
            logger.error(f"Tavily search error: {e}")
    
    # Fall back to Brave search if available
    if BRAVE_API_KEY:
        try:
            return await search_brave(query, max_results)
        except Exception as e:
            logger.error(f"Brave search error: {e}")
    
    # Return empty results if both searches fail
    logger.warning("All search methods failed")
    return []

async def search_tavily(query: str, max_results: int = 8):
    """Search using Tavily API."""
    url = "https://api.tavily.com/search"
    params = {
        "api_key": TAVILY_API_KEY,
        "query": query,
        "search_depth": "advanced",
        "include_domains": [],
        "exclude_domains": [],
        "max_results": max_results,
        "include_answer": False,
        "include_images": False,
        "include_raw_content": True
    }
    
    response = requests.post(url, json=params, timeout=30)
    
    if response.status_code == 200:
        data = response.json()
        results = data.get("results", [])
        return [
            {
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "content": r.get("raw_content", r.get("content", "")),
                "score": r.get("score", 0),
                "source": "tavily"
            }
            for r in results
        ]
    else:
        logger.error(f"Tavily search failed: {response.status_code} - {response.text}")
        return []

async def search_brave(query: str, max_results: int = 8):
    """Search using Brave Search API."""
    url = "https://api.search.brave.com/res/v1/web/search"
    headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": BRAVE_API_KEY
    }
    params = {
        "q": query,
        "count": max_results,
        "search_lang": "en"
    }
    
    response = requests.get(url, headers=headers, params=params, timeout=20)
    
    if response.status_code == 200:
        data = response.json()
        results = data.get("web", {}).get("results", [])
        return [
            {
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "content": r.get("description", ""),
                "score": 1.0 - (idx / len(results)) if len(results) > 0 else 0,
                "source": "brave"
            }
            for idx, r in enumerate(results)
        ]
    else:
        logger.error(f"Brave search failed: {response.status_code} - {response.text}")
        return []

async def generate_deepseek_response(system_prompt: str, user_prompt: str, temperature: float = 0.7, max_tokens: int = 4000):
    """Generate a response using DeepSeek API."""
    logger.info("Generating response with DeepSeek")
    
    if not DEEPSEEK_API_KEY:
        raise ValueError("DeepSeek API key not found")
    
    url = "https://api.deepseek.com/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
    }
    
    data = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    
    response = requests.post(url, headers=headers, json=data, timeout=120)
    
    if response.status_code == 200:
        response_data = response.json()
        generated_text = response_data.get("choices", [{}])[0].get("message", {}).get("content", "")
        return generated_text
    else:
        logger.error(f"DeepSeek API call failed: {response.status_code} - {response.text}")
        raise Exception(f"DeepSeek API call failed: {response.status_code}")

async def perform_deep_research(research_question: str, research_id: str):
    """Perform comprehensive research using multiple steps and sources."""
    log_entries = []
    
    try:
        # Update the state
        research_state[research_id] = {
            "status": "in_progress",
            "start_time": time.time(),
            "log": log_entries,
            "sources": []
        }
        
        # Step 1: Generate query variations for broader search
        log_entries.append("Generating search query variations...")
        query_variations = [
            research_question,
            f"latest research on {research_question}",
            f"detailed analysis of {research_question}",
            f"{research_question} statistics and data",
            f"{research_question} expert opinions",
            f"{research_question} comprehensive overview"
        ]
        
        # Step 2: Search for information using multiple queries
        log_entries.append("Searching for information from multiple sources...")
        all_search_results = []
        
        for query in query_variations:
            search_results = await search_web(query, max_results=5)
            all_search_results.extend(search_results)
        
        # Step 3: Deduplicate results based on URL
        seen_urls = set()
        unique_results = []
        
        for result in all_search_results:
            if result["url"] not in seen_urls:
                seen_urls.add(result["url"])
                unique_results.append(result)
        
        log_entries.append(f"Found {len(unique_results)} unique sources.")
        
        # Step 4: Format sources
        sources = []
        sources_text = ""
        
        for i, result in enumerate(unique_results[:10]):  # Limit to top 10 sources
            domain = "unknown"
            try:
                from urllib.parse import urlparse
                domain = urlparse(result["url"]).netloc
            except:
                pass
            
            source = {
                "title": result["title"],
                "url": result["url"],
                "domain": domain,
                "content": result["content"][:1000] if result["content"] else ""  # Limit content length
            }
            sources.append(source)
            
            # Add to text representation for the LLM
            sources_text += f"Source {i+1}: {result['title']} ({result['url']})\n"
            sources_text += f"Content: {result['content'][:1000]}...\n\n"
        
        # Step 5: Generate comprehensive research report
        log_entries.append("Generating comprehensive research report...")
        
        system_prompt = """You are a research expert tasked with creating comprehensive, fact-based reports. 
Your analysis should be thorough, balanced, and properly sourced. Make sure to synthesize information
from multiple sources, highlight consensus and disagreements, and draw reasoned conclusions."""
        
        user_prompt = f"""Please create a comprehensive research report on the topic: "{research_question}"
        
I have gathered the following sources for you to analyze and synthesize:

{sources_text}

Your report should:
1. Include a clear and informative title
2. Begin with an executive summary highlighting key findings
3. Organize information into logical sections with appropriate headings
4. Synthesize information from different sources, noting agreements and contradictions
5. Include key data points, statistics, and expert opinions when available
6. End with conclusions and implications
7. Properly cite sources throughout using footnotes or inline citations
8. Include a "Sources" section at the end with numbered references

Format your report in Markdown, but make it readable and professional."""
        
        report = await generate_deepseek_response(system_prompt, user_prompt, temperature=0.3, max_tokens=4000)
        log_entries.append("Research report generated successfully.")
        
        # Step 6: Finalize research response
        timestamp = datetime.datetime.now().isoformat()
        
        return ResearchResponse(
            status={"status": "completed", "message": "Research completed successfully"},
            report=report,
            sources=sources,
            timestamp=timestamp,
            service_process_log=log_entries
        )
        
    except Exception as e:
        logger.error(f"Research error: {e}")
        log_entries.append(f"Error: {str(e)}")
        
        return ResearchResponse(
            status={"status": "error", "message": str(e)},
            service_process_log=log_entries
        )
    finally:
        # Clean up research state after a while (background task)
        async def cleanup_research_state():
            await asyncio.sleep(3600)  # Keep research state for 1 hour
            if research_id in research_state:
                del research_state[research_id]
        
        asyncio.create_task(cleanup_research_state())

@app.on_event("startup")
async def startup_event():
    """Initialize any resources needed by the service."""
    logger.info("DeerFlow research service starting up...")
    
    # Check for required API keys
    if not TAVILY_API_KEY and not BRAVE_API_KEY:
        logger.warning("No search API keys found. Web search functionality will be limited.")
    
    if not DEEPSEEK_API_KEY:
        logger.warning("DeepSeek API key not found. LLM functionality will be unavailable.")

@app.get("/health")
async def health_check():
    """Health check endpoint to verify API is working."""
    return {"status": "ok", "timestamp": datetime.datetime.now().isoformat()}

@app.post("/research", response_model=ResearchResponse)
async def perform_research_endpoint(request: ResearchRequest, background_tasks: BackgroundTasks):
    """Endpoint to perform deep research on a given topic."""
    logger.info(f"Received research request: {request.research_question}")
    
    # Generate a unique ID for this research
    import uuid
    research_id = str(uuid.uuid4())
    
    # Create initial response
    initial_response = ResearchResponse(
        status={"status": "processing", "message": "Research started"},
        service_process_log=["Research initialized", "Processing request..."]
    )
    
    # Perform research in the background
    background_tasks.add_task(
        perform_deep_research,
        request.research_question,
        research_id
    )
    
    # Return initial response immediately
    return initial_response

@app.get("/research/{research_id}/status")
async def get_research_status(research_id: str):
    """Check the status of a specific research request."""
    if research_id not in research_state:
        return {"status": "not_found"}
    
    return {
        "status": research_state[research_id]["status"],
        "log": research_state[research_id]["log"],
        "elapsed_time": time.time() - research_state[research_id]["start_time"]
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)