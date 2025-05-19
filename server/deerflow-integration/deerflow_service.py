"""
DeerFlow Research Service

A specialized research service that provides advanced web search, content extraction,
and information synthesis capabilities.
"""

import os
import sys
import json
import uuid
import time
import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Optional, Union, Any

import httpx
import uvicorn
import nltk
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from concurrent.futures import ThreadPoolExecutor

# Initialize logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("deerflow")

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

# Configure API keys from environment
TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY", "")
BRAVE_API_KEY = os.environ.get("BRAVE_API_KEY", "")
SERPER_API_KEY = os.environ.get("SERPER_API_KEY", "")

# Download NLTK data (if not already downloaded)
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)
    
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords', quiet=True)

# In-memory storage for research tasks
active_tasks = {}
completed_tasks = {}

# ==================
# Data Models
# ==================

class ResearchRequest(BaseModel):
    """Research request model"""
    query: str
    depth: str = Field(default="standard", description="Research depth: basic, standard, or deep")
    max_sources: int = Field(default=5, description="Maximum number of sources to use")
    include_domains: Optional[List[str]] = Field(default=None, description="List of domains to include")
    exclude_domains: Optional[List[str]] = Field(default=None, description="List of domains to exclude")
    use_cache: bool = Field(default=True, description="Whether to use cached results")
    user_context: Optional[str] = Field(default=None, description="Additional context for the query")

class Source(BaseModel):
    """Source information model"""
    title: str
    url: str
    domain: str
    content_snippet: Optional[str] = None
    relevance_score: Optional[float] = None

class ResearchResponse(BaseModel):
    """Research response model"""
    id: str
    query: str
    summary: Optional[str] = None
    sources: List[Source] = []
    insights: List[str] = []
    related_topics: Optional[List[str]] = None
    status: str = "in_progress"  # in_progress, analyzing, synthesizing, completed, failed
    error: Optional[str] = None
    created_at: Optional[str] = None
    completed_at: Optional[str] = None

# ==================
# Web Search API Integrations
# ==================

async def search_tavily(query: str, search_depth: str = "basic") -> List[Dict]:
    """
    Search using Tavily API
    """
    if not TAVILY_API_KEY:
        logger.warning("No Tavily API key found, skipping Tavily search")
        return []
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            search_depth_val = 0
            if search_depth == "deep":
                search_depth_val = 10
            elif search_depth == "standard":
                search_depth_val = 5
            else:
                search_depth_val = 3
                
            response = await client.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": TAVILY_API_KEY,
                    "query": query,
                    "search_depth": search_depth_val,
                    "include_answer": False,
                    "include_images": False,
                    "include_raw_content": False,
                    "max_results": 8
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                results = data.get("results", [])
                return [
                    {
                        "title": result.get("title", ""),
                        "url": result.get("url", ""),
                        "content": result.get("content", ""),
                        "domain": result.get("source", "")
                    }
                    for result in results
                ]
            else:
                logger.error(f"Error from Tavily API: {response.text}")
                return []
    except Exception as e:
        logger.error(f"Error searching Tavily: {e}")
        return []

async def search_brave(query: str) -> List[Dict]:
    """
    Search using Brave Search API
    """
    if not BRAVE_API_KEY:
        logger.warning("No Brave API key found, skipping Brave search")
        return []
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                "https://api.search.brave.com/res/v1/web/search",
                params={"q": query, "count": 10},
                headers={"X-Subscription-Token": BRAVE_API_KEY, "Accept": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                results = data.get("web", {}).get("results", [])
                return [
                    {
                        "title": result.get("title", ""),
                        "url": result.get("url", ""),
                        "content": result.get("description", ""),
                        "domain": extract_domain(result.get("url", ""))
                    }
                    for result in results
                ]
            else:
                logger.error(f"Error from Brave API: {response.text}")
                return []
    except Exception as e:
        logger.error(f"Error searching Brave: {e}")
        return []

def extract_domain(url: str) -> str:
    """Extract domain from URL"""
    try:
        from urllib.parse import urlparse
        domain = urlparse(url).netloc
        if domain.startswith("www."):
            domain = domain[4:]
        return domain
    except:
        parts = url.split("/")
        if len(parts) > 2:
            domain = parts[2]
            if domain.startswith("www."):
                domain = domain[4:]
            return domain
        return url

# ==================
# Content Extraction
# ==================

async def extract_content_from_url(url: str) -> Dict[str, Any]:
    """
    Extract content from a URL using trafilatura and newspaper3k
    """
    try:
        # First try with trafilatura for better content extraction
        import trafilatura
        downloaded = trafilatura.fetch_url(url)
        if downloaded:
            extracted = trafilatura.extract(
                downloaded, 
                output_format="json", 
                include_links=True,
                include_tables=True,
                include_formatting=True,
                include_comments=False
            )
            
            if extracted:
                try:
                    data = json.loads(extracted)
                    return {
                        "title": data.get("title", ""),
                        "text": data.get("text", ""),
                        "author": data.get("author", ""),
                        "date": data.get("date", ""),
                        "source": url,
                        "extractor": "trafilatura"
                    }
                except:
                    return {
                        "title": "",
                        "text": extracted,
                        "source": url,
                        "extractor": "trafilatura-text"
                    }
        
        # Fallback to newspaper3k
        import newspaper
        article = newspaper.Article(url)
        article.download()
        article.parse()
        
        # Get the article text
        text = article.text
        
        # If we couldn't get text, try with beautifulsoup
        if not text.strip():
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(url)
                if response.status_code == 200:
                    from bs4 import BeautifulSoup
                    soup = BeautifulSoup(response.text, 'html.parser')
                    # Remove script and style elements
                    for script in soup(["script", "style"]):
                        script.decompose()
                    text = soup.get_text()
                    # Clean up the text
                    lines = (line.strip() for line in text.splitlines())
                    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
                    text = '\n'.join(chunk for chunk in chunks if chunk)
        
        return {
            "title": article.title,
            "text": text,
            "author": article.authors[0] if article.authors else "",
            "date": str(article.publish_date) if article.publish_date else "",
            "source": url,
            "extractor": "newspaper3k"
        }
    except Exception as e:
        logger.error(f"Error extracting content from {url}: {e}")
        return {
            "title": "",
            "text": "",
            "source": url,
            "error": str(e),
            "extractor": "failed"
        }

# ==================
# Task Processing Functions
# ==================

def initialize_research_task(request: ResearchRequest) -> ResearchResponse:
    """Initialize a new research task"""
    task_id = str(uuid.uuid4())
    created_at = datetime.now().isoformat()
    
    # Create initial response
    response = ResearchResponse(
        id=task_id,
        query=request.query,
        sources=[],
        insights=[],
        status="in_progress",
        created_at=created_at
    )
    
    # Store in active tasks
    active_tasks[task_id] = {
        "request": request.dict(),
        "response": response.dict(),
        "raw_sources": [],
        "processed_sources": [],
        "start_time": time.time()
    }
    
    return response

async def process_research_task(task_id: str):
    """Process a research task"""
    if task_id not in active_tasks:
        logger.error(f"Task ID {task_id} not found in active tasks")
        return
    
    task_data = active_tasks[task_id]
    request = ResearchRequest(**task_data["request"])
    response_data = task_data["response"]
    
    try:
        # Step 1: Perform web search
        logger.info(f"Starting web search for query: {request.query}")
        search_results = await perform_combined_search(request.query, request.depth)
        
        # Update task status
        response_data["status"] = "analyzing"
        active_tasks[task_id]["response"] = response_data
        
        # Step 2: Process search results and extract content
        processed_results = await process_search_results(
            search_results, 
            max_sources=request.max_sources,
            include_domains=request.include_domains,
            exclude_domains=request.exclude_domains
        )
        
        # Step 3: Analyze content and extract insights
        response_data["status"] = "synthesizing"
        active_tasks[task_id]["response"] = response_data
        
        insights = extract_insights(processed_results, request.query)
        related_topics = generate_related_topics(request.query, processed_results)
        
        # Create sources list from processed results
        sources = []
        for result in processed_results:
            source = Source(
                title=result.get("title", ""),
                url=result.get("url", ""),
                domain=result.get("domain", ""),
                content_snippet=result.get("summary", ""),
                relevance_score=result.get("relevance_score", 0.0)
            )
            sources.append(source)
        
        # Generate summary based on insights and sources
        summary = generate_summary(insights, request.query)
        
        # Update the response with the processed data
        response_data["sources"] = [s.dict() for s in sources]
        response_data["insights"] = insights
        response_data["related_topics"] = related_topics
        response_data["summary"] = summary
        response_data["status"] = "completed"
        response_data["completed_at"] = datetime.now().isoformat()
        
        # Move from active to completed tasks
        completed_tasks[task_id] = task_data
        completed_tasks[task_id]["response"] = response_data
        
        # Remove from active tasks
        if task_id in active_tasks:
            del active_tasks[task_id]
            
        logger.info(f"Research task {task_id} completed successfully")
        
    except Exception as e:
        logger.error(f"Error processing research task {task_id}: {e}")
        response_data["status"] = "failed"
        response_data["error"] = str(e)
        completed_tasks[task_id] = task_data
        completed_tasks[task_id]["response"] = response_data
        
        # Remove from active tasks
        if task_id in active_tasks:
            del active_tasks[task_id]

async def perform_combined_search(query: str, depth: str = "standard") -> List[Dict]:
    """Perform combined search using multiple search engines"""
    # Run searches in parallel
    tavily_results = asyncio.create_task(search_tavily(query, depth))
    brave_results = asyncio.create_task(search_brave(query))
    
    # Wait for all search tasks to complete
    results = await asyncio.gather(tavily_results, brave_results)
    
    # Combine results
    all_results = []
    urls_seen = set()
    
    for result_set in results:
        for result in result_set:
            url = result.get("url", "")
            if url and url not in urls_seen:
                urls_seen.add(url)
                all_results.append(result)
    
    return all_results

async def process_search_results(
    search_results: List[Dict],
    max_sources: int = 5,
    include_domains: Optional[List[str]] = None,
    exclude_domains: Optional[List[str]] = None
) -> List[Dict]:
    """Process and filter search results"""
    # Apply domain filters
    filtered_results = search_results
    
    if include_domains:
        filtered_results = [
            r for r in filtered_results 
            if any(domain in r.get("domain", "") for domain in include_domains)
        ]
    
    if exclude_domains:
        filtered_results = [
            r for r in filtered_results 
            if not any(domain in r.get("domain", "") for domain in exclude_domains)
        ]
    
    # Limit to max_sources
    filtered_results = filtered_results[:max_sources]
    
    # Extract content from URLs in parallel
    extraction_tasks = [extract_content_from_url(result["url"]) for result in filtered_results]
    extracted_contents = await asyncio.gather(*extraction_tasks)
    
    # Combine search results with extracted content
    processed_results = []
    for i, result in enumerate(filtered_results[:len(extracted_contents)]):
        extracted = extracted_contents[i]
        
        # Skip if we couldn't extract any content
        if not extracted.get("text"):
            continue
            
        # Create summary from extracted text
        text = extracted.get("text", "")
        summary = summarize_text(text, max_length=200)
        
        processed_result = {
            "title": extracted.get("title") or result.get("title", ""),
            "url": result.get("url", ""),
            "domain": result.get("domain", ""),
            "content": text,
            "summary": summary,
            "date": extracted.get("date", ""),
            "author": extracted.get("author", ""),
            "relevance_score": 1.0  # Default score, can be improved with ML
        }
        
        processed_results.append(processed_result)
    
    return processed_results

def extract_insights(processed_results: List[Dict], query: str) -> List[str]:
    """Extract key insights from processed search results"""
    # Simple insight extraction based on text frequency analysis
    from nltk.tokenize import sent_tokenize
    from nltk.corpus import stopwords
    from collections import Counter
    
    stop_words = set(stopwords.words('english'))
    
    # Combine all content
    all_text = " ".join([result.get("content", "") for result in processed_results])
    
    # Extract sentences
    sentences = sent_tokenize(all_text)
    
    # Score sentences based on word frequency
    word_frequencies = Counter()
    for result in processed_results:
        content = result.get("content", "").lower()
        for word in content.split():
            if len(word) > 3 and word not in stop_words:
                word_frequencies[word] += 1
    
    # Score sentences based on word frequency
    sentence_scores = {}
    for sentence in sentences:
        for word in sentence.lower().split():
            if word in word_frequencies:
                if sentence not in sentence_scores:
                    sentence_scores[sentence] = 0
                sentence_scores[sentence] += word_frequencies[word]
    
    # Get top sentences as insights
    insights = []
    for sentence, score in sorted(sentence_scores.items(), key=lambda x: x[1], reverse=True):
        if len(sentence.split()) > 5 and sentence not in insights:
            insights.append(sentence)
        if len(insights) >= 7:  # Limit to top 7 insights
            break
    
    return insights

def generate_related_topics(query: str, processed_results: List[Dict]) -> List[str]:
    """Generate related topics based on the query and search results"""
    # Simple approach based on frequency analysis
    from nltk.tokenize import word_tokenize
    from nltk.corpus import stopwords
    from collections import Counter
    import re
    
    stop_words = set(stopwords.words('english'))
    
    # Extract noun phrases as potential topics
    all_text = " ".join([
        result.get("title", "") + " " + 
        result.get("summary", "") 
        for result in processed_results
    ])
    
    # Simple noun phrase extraction (can be improved with ML)
    words = [w.lower() for w in word_tokenize(all_text) if w.isalnum()]
    filtered_words = [w for w in words if w not in stop_words and len(w) > 3]
    
    # Count word frequencies
    word_counts = Counter(filtered_words)
    
    # Extract bigrams (two-word phrases)
    bigrams = []
    for i in range(len(words) - 1):
        if words[i] not in stop_words and words[i+1] not in stop_words:
            bigrams.append(words[i] + " " + words[i+1])
    
    bigram_counts = Counter(bigrams)
    
    # Combine top words and bigrams
    topics = []
    
    # Add top bigrams
    for bigram, count in bigram_counts.most_common(5):
        if count > 1:  # Only include bigrams that appear multiple times
            topics.append(bigram.title())
    
    # Add top words
    for word, count in word_counts.most_common(10):
        if count > 2 and word.title() not in topics:  # Only include words that appear multiple times
            topics.append(word.title())
    
    # Limit to top 5 topics
    return topics[:5]

def summarize_text(text: str, max_length: int = 300) -> str:
    """Create a summary of the text"""
    from nltk.tokenize import sent_tokenize
    from nltk.corpus import stopwords
    
    # Simple extractive summarization
    sentences = sent_tokenize(text)
    
    if not sentences:
        return ""
    
    # For very short texts, just return the text
    if len(text) <= max_length:
        return text
        
    # Pick the first sentence and some key sentences
    summary = sentences[0]
    
    # If we need more content, add middle and final sentences
    if len(summary) < max_length and len(sentences) > 2:
        # Add a middle sentence
        middle_idx = len(sentences) // 2
        if summary not in sentences[middle_idx]:
            summary += " " + sentences[middle_idx]
        
        # Add the final sentence if we still have room
        if len(summary) < max_length and sentences[-1] not in summary:
            summary += " " + sentences[-1]
    
    # Truncate if still too long
    if len(summary) > max_length:
        summary = summary[:max_length] + "..."
        
    return summary

def generate_summary(insights: List[str], query: str) -> str:
    """Generate an overall summary based on insights"""
    if not insights:
        return f"No significant insights found for the query: {query}"
    
    # Simple approach: combine top insights
    summary = "Based on the research findings: "
    combined_insights = ". ".join(insights[:3])  # Use top 3 insights
    
    return summary + combined_insights

# ==================
# API Endpoints
# ==================

@app.get("/")
async def root():
    """Root endpoint - health check"""
    return {"status": "ok", "message": "DeerFlow Research Service is running"}

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    api_keys = {
        "tavily": bool(TAVILY_API_KEY),
        "brave": bool(BRAVE_API_KEY),
        "serper": bool(SERPER_API_KEY)
    }
    
    return {
        "status": "ok", 
        "message": "DeerFlow service is operational",
        "available_apis": api_keys,
        "active_tasks": len(active_tasks),
        "completed_tasks": len(completed_tasks)
    }

@app.post("/api/research/start")
async def start_research(request: ResearchRequest):
    """Start a new research task"""
    # Initialize the research task
    response = initialize_research_task(request)
    task_id = response.id
    
    # Start processing in background
    asyncio.create_task(process_research_task(task_id))
    
    return {"id": task_id, "status": "in_progress"}

@app.get("/api/research/{task_id}")
async def get_research_status(task_id: str):
    """Get the status of a research task"""
    # Check if task is active
    if task_id in active_tasks:
        response_data = active_tasks[task_id]["response"]
        return ResearchResponse(**response_data)
    
    # Check if task is completed
    if task_id in completed_tasks:
        response_data = completed_tasks[task_id]["response"]
        return ResearchResponse(**response_data)
    
    # Task not found
    raise HTTPException(status_code=404, detail=f"Research task {task_id} not found")

@app.post("/api/research/complete")
async def run_complete_research(request: ResearchRequest):
    """Run a complete research task (start and wait for completion)"""
    # Initialize the research task
    response = initialize_research_task(request)
    task_id = response.id
    
    # Process the task (blocking)
    await process_research_task(task_id)
    
    # Get the completed response
    if task_id in completed_tasks:
        response_data = completed_tasks[task_id]["response"]
        return ResearchResponse(**response_data)
    
    # Task failed
    raise HTTPException(status_code=500, detail=f"Research task {task_id} failed")

# ==================
# Main Entry Point
# ==================

if __name__ == "__main__":
    port = int(os.environ.get("DEERFLOW_PORT", 8765))
    host = os.environ.get("DEERFLOW_HOST", "0.0.0.0")
    
    logger.info(f"Starting DeerFlow Research Service on {host}:{port}")
    uvicorn.run("deerflow_service:app", host=host, port=port, reload=False)