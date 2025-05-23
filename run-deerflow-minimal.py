"""
Minimal DeerFlow service for Tongkeeper

This script runs a minimal version of the DeerFlow service with necessary API integrations
for deep research capabilities.
"""
import os
import asyncio
import logging
import requests
import json
from datetime import datetime
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("deerflow-minimal.log")
    ]
)
logger = logging.getLogger("deerflow-minimal")

# Initialize FastAPI app
app = FastAPI(title="DeerFlow Minimal Service")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Check for API keys
if not os.environ.get("TAVILY_API_KEY") and not os.environ.get("BRAVE_API_KEY"):
    logger.warning("No search API keys detected! Add TAVILY_API_KEY or BRAVE_API_KEY to your environment variables for web search capabilities.")
    
if not os.environ.get("DEEPSEEK_API_KEY"):
    logger.warning("No DEEPSEEK_API_KEY detected! Add it to your environment variables for advanced LLM capabilities.")

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

# Get API keys from environment
TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY")
BRAVE_API_KEY = os.environ.get("BRAVE_API_KEY")
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY")

# Check for required API keys
if not TAVILY_API_KEY and not BRAVE_API_KEY:
    logger.warning("No search API keys found. Web search will be limited.")
if not DEEPSEEK_API_KEY:
    logger.warning("DeepSeek API key not found. LLM processing will be unavailable.")

# In-memory research state
research_jobs = {}

async def search_web(query: str, max_results: int = 5):
    """Search the web using available search engines."""
    logger.info(f"Searching web for: {query}")
    
    # Try Tavily if key is available
    if TAVILY_API_KEY:
        try:
            url = "https://api.tavily.com/search"
            payload = {
                "api_key": TAVILY_API_KEY,
                "query": query,
                "search_depth": "advanced",
                "include_domains": [],
                "exclude_domains": [],
                "max_results": max_results
            }
            
            response = requests.post(url, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                return data.get("results", [])
            else:
                logger.error(f"Tavily search error: {response.status_code} - {response.text}")
        except Exception as e:
            logger.error(f"Tavily search exception: {e}")
    
    # Try Brave if key is available
    if BRAVE_API_KEY:
        try:
            url = "https://api.search.brave.com/res/v1/web/search"
            headers = {
                "Accept": "application/json",
                "X-Subscription-Token": BRAVE_API_KEY
            }
            params = {
                "q": query,
                "count": max_results
            }
            
            response = requests.get(url, headers=headers, params=params)
            
            if response.status_code == 200:
                data = response.json()
                results = []
                
                for item in data.get("web", {}).get("results", []):
                    results.append({
                        "title": item.get("title", ""),
                        "url": item.get("url", ""),
                        "description": item.get("description", "")
                    })
                
                return results
            else:
                logger.error(f"Brave search error: {response.status_code} - {response.text}")
        except Exception as e:
            logger.error(f"Brave search exception: {e}")
    
    # Return empty results if all search methods fail
    return []

async def generate_with_gemini(system_prompt: str, user_prompt: str, max_tokens: int = 25000):
    """Generate text using Gemini API for comprehensive analysis."""
    try:
        import google.generativeai as genai
        
        # Configure Gemini
        genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Combine prompts
        full_prompt = f"{system_prompt}\n\n{user_prompt}"
        
        # Generate with high token limit
        response = model.generate_content(
            full_prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=max_tokens,
                temperature=0.7,
            )
        )
        
        return response.text
        
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        # Fall back to DeepSeek if Gemini fails
        return await generate_with_deepseek(system_prompt, user_prompt, max_tokens=8000)

async def generate_with_deepseek(system_prompt: str, user_prompt: str, max_tokens: int = 8000):
    """Generate text using DeepSeek API."""
    if not DEEPSEEK_API_KEY:
        return "ERROR: DeepSeek API key not available"
    
    # Ensure max_tokens doesn't exceed DeepSeek's limit
    max_tokens = min(max_tokens, 8192)
    
    try:
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
            "temperature": 0.3,
            "max_tokens": 8000
        }
        
        response = requests.post(url, headers=headers, json=data)
        
        if response.status_code == 200:
            return response.json()["choices"][0]["message"]["content"]
        else:
            logger.error(f"DeepSeek API error: {response.status_code} - {response.text}")
            return f"Error generating text: {response.status_code}"
    except Exception as e:
        logger.error(f"DeepSeek API exception: {e}")
        return f"Exception generating text: {str(e)}"

async def perform_deep_research(research_id: str, question: str):
    """Perform deep research on a given question."""
    log_entries = []
    research_jobs[research_id] = {
        "status": "in_progress",
        "log_entries": log_entries,
        "start_time": datetime.now().isoformat()
    }
    
    try:
        # Step 1: Generate query variations
        log_entries.append("Generating search query variations...")
        query_variations = [
            question,
            f"latest research on {question}",
            f"detailed analysis of {question}",
            f"{question} statistics and data",
            f"{question} expert opinions"
        ]
        
        # Step 2: Search for information using multiple queries
        log_entries.append("Searching for information from multiple sources...")
        all_results = []
        
        for query in query_variations:
            results = await search_web(query)
            all_results.extend(results)
        
        # Step 3: Deduplicate results
        log_entries.append("Processing search results...")
        seen_urls = set()
        unique_results = []
        
        for result in all_results:
            url = result.get("url")
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique_results.append(result)
        
        # Step 4: Format sources
        sources = []
        sources_text = ""
        
        for i, result in enumerate(unique_results[:10]):  # Limit to top 10 sources
            try:
                from urllib.parse import urlparse
                domain = urlparse(result.get("url", "")).netloc
            except:
                domain = "unknown"
            
            source = {
                "title": result.get("title", "Untitled"),
                "url": result.get("url", ""),
                "domain": domain,
                "content": result.get("content", result.get("description", ""))
            }
            
            sources.append(source)
            sources_text += f"Source {i+1}: {source['title']} ({source['url']})\n"
            sources_text += f"Content: {source['content']}\n\n"
        
        # Step 5: Generate comprehensive report
        log_entries.append("Generating comprehensive research report...")
        
        system_prompt = """You are a research expert tasked with creating comprehensive, fact-based reports. 
Your analysis should be thorough, balanced, and properly sourced."""
        
        user_prompt = f"""Create a comprehensive research report on the topic: "{question}"
        
I have gathered the following sources for you to analyze:

{sources_text}

Your report should include:
1. A clear title
2. Executive summary highlighting key findings
3. Organized sections with appropriate headings
4. Synthesis of information from multiple sources
5. Key data points and statistics
6. Conclusions and implications
7. Proper source citations
8. A Sources section at the end with numbered references

Format the report in Markdown."""
        
        # Smart model selection based on request parameters
        model_id = request.model_id if hasattr(request, 'model_id') else "deepseek-chat"
        
        # Use appropriate API based on model and research depth  
        if model_id == "gemini-1.5-flash" or (hasattr(request, 'research_length') and request.research_length == 'comprehensive'):
            # Use Gemini for comprehensive analysis with high token limit
            max_tokens = 25000
            log_entries.append(f"Using Gemini 1.5 Flash for comprehensive analysis with {max_tokens} tokens")
            report = await generate_with_gemini(system_prompt, user_prompt, max_tokens)
        else:
            # Use DeepSeek for standard analysis
            max_tokens = 8000
            log_entries.append(f"Using DeepSeek for standard analysis with {max_tokens} tokens")
            report = await generate_with_deepseek(system_prompt, user_prompt, max_tokens)
        
        log_entries.append("Research report generated successfully.")
        
        # Update job status
        research_jobs[research_id] = {
            "status": "completed",
            "log_entries": log_entries,
            "report": report,
            "sources": sources,
            "completion_time": datetime.now().isoformat()
        }
        
        return {
            "status": {"status": "completed", "message": "Research completed successfully"},
            "report": report,
            "sources": sources,
            "timestamp": datetime.now().isoformat(),
            "service_process_log": log_entries
        }
        
    except Exception as e:
        logger.error(f"Research error: {str(e)}")
        log_entries.append(f"Error: {str(e)}")
        
        # Update job status on error
        research_jobs[research_id] = {
            "status": "error",
            "log_entries": log_entries,
            "error": str(e),
            "completion_time": datetime.now().isoformat()
        }
        
        return {
            "status": {"status": "error", "message": str(e)},
            "service_process_log": log_entries
        }

@app.on_event("startup")
async def startup():
    """Initialize anything needed for the service."""
    logger.info("DeerFlow service starting...")

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "tavily_api": TAVILY_API_KEY is not None,
        "brave_api": BRAVE_API_KEY is not None,
        "deepseek_api": DEEPSEEK_API_KEY is not None
    }

@app.post("/research", response_model=ResearchResponse)
async def research_endpoint(request: ResearchRequest, background_tasks: BackgroundTasks):
    """Endpoint to perform deep research."""
    logger.info(f"Received research request: {request.research_question}")
    
    # Generate a unique ID for this research
    import uuid
    research_id = str(uuid.uuid4())
    
    # Start research in background
    background_tasks.add_task(
        perform_deep_research,
        research_id,
        request.research_question
    )
    
    # Return initial response
    return ResearchResponse(
        status={"status": "processing", "message": "Research started", "id": research_id},
        service_process_log=["Research initiated", "Processing request..."]
    )

@app.get("/research/{research_id}")
async def get_research_status(research_id: str):
    """Check status of a research request."""
    if research_id not in research_jobs:
        return {"status": "not_found"}
    
    job = research_jobs[research_id]
    
    # If research is completed, return full results
    if job.get("status") == "completed":
        return {
            "status": {"status": "completed"},
            "report": job.get("report"),
            "sources": job.get("sources"),
            "service_process_log": job.get("log_entries")
        }
    
    # Otherwise return status
    return {
        "status": {"status": job.get("status")},
        "service_process_log": job.get("log_entries")
    }

if __name__ == "__main__":
    logger.info("Starting DeerFlow minimal service on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)