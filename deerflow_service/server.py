"""
DeerFlow Research Service

This service provides a FastAPI server to handle deep research requests using DeerFlow.
Enhanced with intelligent agent capabilities for advanced planning and reasoning.
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

# Import the new agent core and learning system
from agent_core import agent_core, TaskStatus
try:
    from learning_system import learning_system, UserFeedback, FeedbackType
    LEARNING_AVAILABLE = True
except ImportError:
    LEARNING_AVAILABLE = False

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

# New Agent Endpoints for Advanced Research

class AgentResearchRequest(BaseModel):
    research_question: str
    depth: Optional[str] = "comprehensive"
    include_reasoning: Optional[bool] = True
    learning_mode: Optional[bool] = True
    preferences: Optional[Dict[str, Any]] = None

class AgentResearchResponse(BaseModel):
    task_id: str
    status: str
    message: str

@app.post("/agent/research", response_model=AgentResearchResponse)
async def create_agent_research_task(request: AgentResearchRequest):
    """Create a new intelligent research task with planning and reasoning"""
    logger.info(f"Creating agent research task: {request.research_question}")
    
    try:
        # Create task using agent core
        task_id = await agent_core.create_research_task(
            query=request.research_question,
            preferences={
                "depth": request.depth,
                "include_reasoning": request.include_reasoning,
                "learning_mode": request.learning_mode,
                **(request.preferences or {})
            }
        )
        
        return AgentResearchResponse(
            task_id=task_id,
            status="created",
            message="Research task created successfully with intelligent planning"
        )
        
    except Exception as e:
        logger.error(f"Failed to create agent research task: {e}")
        return AgentResearchResponse(
            task_id="",
            status="error",
            message=f"Failed to create task: {str(e)}"
        )

@app.get("/agent/task/{task_id}")
async def get_agent_task_status(task_id: str):
    """Get detailed status of an agent research task"""
    logger.info(f"Getting status for agent task: {task_id}")
    
    try:
        status = agent_core.get_task_status(task_id)
        if not status:
            return {"error": "Task not found", "task_id": task_id}
        
        return status
        
    except Exception as e:
        logger.error(f"Error getting task status: {e}")
        return {"error": str(e), "task_id": task_id}

@app.get("/agent/tasks")
async def list_agent_tasks():
    """List all active agent tasks"""
    try:
        tasks = []
        for task_id in agent_core.active_agents.keys():
            status = agent_core.get_task_status(task_id)
            if status:
                tasks.append({
                    "task_id": task_id,
                    "status": status["status"],
                    "progress": status["progress"],
                    "query": status["metadata"].get("query", "")[:100] + "...",
                    "created_at": status["metadata"].get("created_at")
                })
        
        return {"tasks": tasks, "total": len(tasks)}
        
    except Exception as e:
        logger.error(f"Error listing tasks: {e}")
        return {"error": str(e), "tasks": [], "total": 0}

@app.post("/agent/cleanup")
async def cleanup_agent_tasks(max_age_hours: int = 24):
    """Clean up completed agent tasks"""
    try:
        initial_count = len(agent_core.active_agents)
        agent_core.cleanup_completed_tasks(max_age_hours)
        final_count = len(agent_core.active_agents)
        
        return {
            "message": f"Cleaned up {initial_count - final_count} tasks",
            "remaining_tasks": final_count
        }
        
    except Exception as e:
        logger.error(f"Error during cleanup: {e}")
        return {"error": str(e)}

# Learning System Endpoints (Phase 3)

class FeedbackRequest(BaseModel):
    task_id: str
    feedback_type: str  # "accuracy", "relevance", "completeness", "timeliness", "overall"
    rating: float  # 1-5 scale
    comments: Optional[str] = None
    improvement_suggestions: Optional[List[str]] = None

@app.post("/agent/feedback")
async def submit_feedback(request: FeedbackRequest):
    """Submit user feedback for learning and improvement"""
    if not LEARNING_AVAILABLE:
        return {"error": "Learning system not available"}
    
    try:
        # Convert string to FeedbackType enum
        feedback_type_map = {
            "accuracy": FeedbackType.ACCURACY,
            "relevance": FeedbackType.RELEVANCE,
            "completeness": FeedbackType.COMPLETENESS,
            "timeliness": FeedbackType.TIMELINESS,
            "overall": FeedbackType.OVERALL
        }
        
        feedback_type = feedback_type_map.get(request.feedback_type, FeedbackType.OVERALL)
        
        # Create feedback object
        feedback = UserFeedback(
            task_id=request.task_id,
            feedback_type=feedback_type,
            rating=request.rating,
            comments=request.comments,
            improvement_suggestions=request.improvement_suggestions or [],
            timestamp=time.time()
        )
        
        # Process feedback through learning system
        learning_results = learning_system.feedback_processor.process_feedback(feedback)
        
        return {
            "message": "Feedback processed successfully",
            "learning_insights": learning_results,
            "thank_you": "Your feedback helps us improve!"
        }
        
    except Exception as e:
        logger.error(f"Error processing feedback: {e}")
        return {"error": str(e)}

@app.get("/agent/learning/summary")
async def get_learning_summary():
    """Get comprehensive learning system summary"""
    if not LEARNING_AVAILABLE:
        return {"error": "Learning system not available"}
    
    try:
        summary = learning_system.get_learning_summary()
        return summary
        
    except Exception as e:
        logger.error(f"Error getting learning summary: {e}")
        return {"error": str(e)}

@app.get("/agent/learning/insights")
async def get_learning_insights():
    """Get actionable insights from the learning system"""
    if not LEARNING_AVAILABLE:
        return {"error": "Learning system not available"}
    
    try:
        insights = {
            "strategy_performance": learning_system.strategy_optimizer.get_strategy_insights(),
            "feedback_trends": learning_system.feedback_processor.get_feedback_summary(),
            "performance_health": learning_system.performance_monitor.get_performance_insights(),
            "recommendations": learning_system.performance_monitor.suggest_optimizations()
        }
        
        return insights
        
    except Exception as e:
        logger.error(f"Error getting learning insights: {e}")
        return {"error": str(e)}

@app.post("/agent/learning/optimize")
async def optimize_strategies():
    """Trigger strategy optimization based on learning data"""
    if not LEARNING_AVAILABLE:
        return {"error": "Learning system not available"}
    
    try:
        # Get current strategy insights
        insights = learning_system.strategy_optimizer.get_strategy_insights()
        
        # Generate optimization recommendations
        recommendations = []
        
        if insights.get("strategy_rankings"):
            best_strategies = insights["strategy_rankings"][:3]
            recommendations.append(f"Top performing strategies: {', '.join(s['strategy'] for s in best_strategies)}")
            
            # Check if any strategies are underperforming
            poor_strategies = [s for s in insights["strategy_rankings"] if s["success_rate"] < 0.6]
            if poor_strategies:
                recommendations.append(f"Consider improving: {', '.join(s['strategy'] for s in poor_strategies)}")
        
        return {
            "message": "Strategy optimization completed",
            "current_insights": insights,
            "optimization_recommendations": recommendations,
            "next_steps": [
                "Continue collecting feedback for better optimization",
                "Monitor strategy performance trends",
                "Adjust exploration/exploitation balance as needed"
            ]
        }
        
    except Exception as e:
        logger.error(f"Error during strategy optimization: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)