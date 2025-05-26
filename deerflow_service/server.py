"""
DeerFlow Research Service

This service provides a FastAPI server to handle deep research requests using DeerFlow.
Enhanced with intelligent agent capabilities for advanced planning and reasoning.
"""
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
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
import aiohttp

# Import optimization components
from config_manager import load_config, get_config
from error_handler import error_handler, with_retry, with_circuit_breaker
from metrics import MetricsCollector

# Import the new agent core and learning system
from agent_core import agent_core, TaskStatus
try:
    from learning_system import learning_system, UserFeedback, FeedbackType
    LEARNING_AVAILABLE = True
except ImportError:
    LEARNING_AVAILABLE = False

# Import full DeerFlow agent system
try:
    from full_agent_system import full_agent_system
    FULL_DEERFLOW_AVAILABLE = True
except ImportError:
    FULL_DEERFLOW_AVAILABLE = False

# Load configuration first
config = load_config()

# Configure logging based on config
log_level = getattr(logging, config.log_level.upper(), logging.INFO)
logging.basicConfig(
    level=log_level,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("deerflow.log")
    ]
)
logger = logging.getLogger("deerflow_service")

# Initialize metrics collector
metrics = MetricsCollector()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown events"""
    # Startup
    logger.info("DeerFlow research service starting up...")
    logger.info(f"Environment: {config.environment}")
    logger.info(f"Debug mode: {config.debug}")
    logger.info(f"API keys configured: {bool(config.api.deepseek_api_key)}")
    
    # Initialize error recovery handlers
    await setup_error_handlers()
    
    yield
    
    # Shutdown
    logger.info("Shutting down DeerFlow research service...")
    
    # Generate final metrics report
    final_metrics = metrics.get_metrics_summary()
    logger.info(f"Final metrics: {final_metrics}")

async def setup_error_handlers():
    """Setup error recovery handlers"""
    
    async def api_key_recovery(error_info):
        """Recovery handler for API key errors"""
        logger.warning("API key error detected, switching to fallback services")
        return {"fallback": True, "message": "Using fallback services"}
    
    async def rate_limit_recovery(error_info):
        """Recovery handler for rate limit errors"""
        logger.warning("Rate limit detected, implementing backoff")
        await asyncio.sleep(60)  # Wait 1 minute
        return {"retry_after": 60}
    
    error_handler.register_recovery_handler("APIKeyError", api_key_recovery)
    error_handler.register_recovery_handler("RateLimitError", rate_limit_recovery)

# Initialize FastAPI with lifespan
app = FastAPI(lifespan=lifespan)

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
    research_depth: Optional[int] = 3
    research_length: Optional[str] = "comprehensive"  # brief, standard, comprehensive, detailed
    research_tone: Optional[str] = "analytical"  # casual, professional, analytical, academic
    min_word_count: Optional[int] = 1500

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

def get_token_limit_by_depth(research_depth: int) -> int:
    """
    Universal token allocation based on research depth for ALL models
    Depth 1: 8,000 tokens (Quick insights)
    Depth 2: 15,000 tokens (Detailed analysis)  
    Depth 3: 25,000 tokens (Comprehensive research)
    """
    token_mapping = {
        1: 8000,   # Quick insights
        2: 15000,  # Detailed analysis  
        3: 25000   # Comprehensive research
    }
    return token_mapping.get(research_depth, 8000)  # Default to 8000 if invalid depth

# Helper functions for research
async def search_web(query: str, max_results: int = 8):
    """Enhanced web search using intelligent rate limiting and caching."""
    logger.info(f"Enhanced web search for: {query} with {max_results} results")

    try:
        # Use the intelligent search manager from the Node.js server
        import aiohttp
        import asyncio

        async with aiohttp.ClientSession() as session:
            # Call our intelligent search endpoint
            async with session.post(
                'http://localhost:5000/api/enhanced-web-search/search',
                json={
                    'query': query,
                    'maxResults': max_results,
                    'searchType': 'all',
                    'freshness': 'week'
                },
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    results = data.get('results', [])

                    # Convert to DeerFlow format
                    formatted_results = []
                    for result in results:
                        formatted_results.append({
                            'title': result.get('title', 'Untitled'),
                            'url': result.get('url', ''),
                            'content': result.get('content', ''),
                            'source': result.get('source', 'Web'),
                            'score': result.get('score', 1.0)
                        })

                    logger.info(f"Intelligent search returned {len(formatted_results)} results from {data.get('searchEnginesUsed', [])}")
                    return formatted_results
                else:
                    logger.error(f"Search endpoint returned status: {response.status}")

    except Exception as e:
        logger.error(f"Intelligent search failed, using fallback: {e}")

    # Fallback to direct search with basic rate limiting
    all_results = []
    search_engines_used = []

    # Try Tavily with rate limiting
    if TAVILY_API_KEY:
        try:
            await asyncio.sleep(1)  # Basic rate limiting
            tavily_results = await search_tavily(query, max_results // 2)
            if tavily_results:
                all_results.extend(tavily_results)
                search_engines_used.append("Tavily")
                logger.info(f"Tavily fallback returned {len(tavily_results)} results")
        except Exception as e:
            logger.error(f"Tavily fallback error: {e}")

    # Try Brave with rate limiting
    if len(all_results) < max_results and BRAVE_API_KEY:
        try:
            await asyncio.sleep(2)  # Longer delay for Brave
            brave_results = await search_brave(query, max_results - len(all_results))
            if brave_results:
                all_results.extend(brave_results)
                search_engines_used.append("Brave")
                logger.info(f"Brave fallback returned {len(brave_results)} results")
        except Exception as e:
            logger.error(f"Brave fallback error: {e}")

    # Remove duplicates
    seen_urls = set()
    unique_results = []
    for result in all_results:
        if result.get('url') and result['url'] not in seen_urls:
            seen_urls.add(result['url'])
            unique_results.append(result)

    logger.info(f"Fallback search completed. Found {len(unique_results)} unique results from {search_engines_used}")
    return unique_results[:max_results]

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

async def search_duckduckgo(query: str, max_results: int = 8):
    """Search using DuckDuckGo Instant Answer API (no API key required)."""
    try:
        import aiohttp
        import json
        from urllib.parse import quote

        # DuckDuckGo Instant Answer API endpoint
        encoded_query = quote(query)
        url = f"https://api.duckduckgo.com/?q={encoded_query}&format=json&no_html=1&skip_disambig=1"

        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=10) as response:
                if response.status == 200:
                    data = await response.json()
                    results = []

                    # Process DuckDuckGo results
                    if data.get('RelatedTopics'):
                        for topic in data.get('RelatedTopics', [])[:max_results]:
                            if isinstance(topic, dict) and 'Text' in topic and 'FirstURL' in topic:
                                results.append({
                                    'title': topic.get('Text', '')[:100] + '...' if len(topic.get('Text', '')) > 100 else topic.get('Text', ''),
                                    'url': topic.get('FirstURL', ''),
                                    'snippet': topic.get('Text', ''),
                                    'domain': topic.get('FirstURL', '').split('/')[2] if '/' in topic.get('FirstURL', '') else 'duckduckgo.com'
                                })

                    # If no related topics, try abstract
                    if not results and data.get('Abstract'):
                        results.append({
                            'title': data.get('Heading', 'DuckDuckGo Result'),
                            'url': data.get('AbstractURL', 'https://duckduckgo.com'),
                            'snippet': data.get('Abstract', ''),
                            'domain': data.get('AbstractURL', '').split('/')[2] if data.get('AbstractURL') and '/' in data.get('AbstractURL') else 'duckduckgo.com'
                        })

                    logger.info(f"DuckDuckGo search returned {len(results)} results")
                    return results
                else:
                    logger.error(f"DuckDuckGo API error: {response.status}")
                    return []
    except Exception as e:
        logger.error(f"DuckDuckGo search failed: {e}")
        return []

async def search_brave(query: str, max_results: int = 8):
    """Search using Brave Search API with enhanced features."""
    url = "https://api.search.brave.com/res/v1/web/search"
    headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": BRAVE_API_KEY
    }
    params = {
        "q": query,
        "count": max_results,
        "search_lang": "en",
        "freshness": "pw",  # Past week for freshness
        "safesearch": "moderate"
    }

    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=headers, params=params, timeout=20) as response:
            if response.status == 200:
                data = await response.json()
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
                logger.error(f"Brave search failed: {response.status}")
                return []

async def search_newsdata(query: str, max_results: int = 5):
    """Search for news using NewsData.io API for current events."""
    if not os.getenv("NEWSDATA_API_KEY"):
        return []

    try:
        url = "https://newsdata.io/api/1/news"
        params = {
            "apikey": os.getenv("NEWSDATA_API_KEY"),
            "q": query,
            "language": "en",
            "size": max_results,
            "prioritydomain": "top"
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, timeout=15) as response:
                if response.status == 200:
                    data = await response.json()
                    articles = data.get("results", [])
                    return [
                        {
                            "title": article.get("title", ""),
                            "url": article.get("link", ""),
                            "content": article.get("description", ""),
                            "score": 1.0,
                            "source": "newsdata",
                            "published_date": article.get("pubDate", "")
                        }
                        for article in articles if article.get("link")
                    ]
                else:
                    logger.error(f"NewsData search failed: {response.status}")
                    return []
    except Exception as e:
        logger.error(f"NewsData search error: {e}")
        return []

async def generate_gemini_response(system_prompt: str, user_prompt: str, max_tokens: int = 25000):
    """Generate a response using Gemini API for comprehensive analysis."""
    logger.info(f"Generating comprehensive response using Gemini 1.5 Flash with {max_tokens} tokens")

    try:
        import google.generativeai as genai

        # Configure Gemini
        gemini_api_key = os.environ.get("GEMINI_API_KEY")
        if not gemini_api_key:
            raise ValueError("Gemini API key not found - falling back to DeepSeek")

        genai.configure(api_key=gemini_api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')

        # Combine prompts for comprehensive analysis
        full_prompt = f"{system_prompt}\n\n{user_prompt}"

        # Generate with high token limit for comprehensive analysis
        response = model.generate_content(
            full_prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=max_tokens,
                temperature=0.7,
            )
        )

        return response.text

    except Exception as e:
        logger.error(f"Gemini API error: {e} - falling back to DeepSeek")
        # Fall back to DeepSeek with limited tokens if Gemini fails
        return await generate_deepseek_response(system_prompt, user_prompt, max_tokens=8000)

async def generate_deepseek_response(system_prompt: str, user_prompt: str, temperature: float = 0.7, max_tokens: int = 8000, research_length: str = "comprehensive", research_tone: str = "analytical", min_word_count: int = 1000):
    """Generate a response using DeepSeek API with enhanced length and tone controls."""
    logger.info(f"Generating {research_length} response with {research_tone} tone using DeepSeek")

    if not DEEPSEEK_API_KEY:
        raise ValueError("DeepSeek API key not found")

    url = "https://api.deepseek.com/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
    }

    # Create enhanced system prompt based on length and tone preferences
    length_instructions = {
        "brief": "Provide a concise 300-500 word analysis with key points.",
        "standard": "Provide a comprehensive 800-1200 word analysis with detailed sections.",
        "comprehensive": "Provide an extensive 1500-2500 word analysis with thorough coverage of all aspects.",
        "detailed": "Provide an in-depth 2500+ word analysis with comprehensive examination of all facets."
    }

    tone_instructions = {
        "casual": "Use conversational, accessible language while maintaining accuracy.",
        "professional": "Use clear, business-appropriate language with professional terminology.",
        "analytical": "Use precise, data-driven language with logical structure and evidence-based conclusions.",
        "academic": "Use formal, scholarly language with citations and theoretical frameworks."
    }

    enhanced_system_prompt = f"""{system_prompt}

RESEARCH OUTPUT REQUIREMENTS:
- LENGTH: {length_instructions.get(research_length, length_instructions["comprehensive"])}
- TONE: {tone_instructions.get(research_tone, tone_instructions["analytical"])}
- MINIMUM WORDS: {min_word_count}

STRUCTURE REQUIREMENTS:
1. Executive Summary (2-3 paragraphs)
2. Detailed Analysis (multiple subsections with headers)
3. Key Findings (bulleted insights)
4. Current Developments (latest updates)
5. Multiple Perspectives (different viewpoints)
6. Supporting Evidence (data and examples)
7. Implications and Context (broader significance)
8. Conclusions and Outlook (future considerations)

QUALITY STANDARDS:
- Use specific examples and concrete data
- Include multiple authoritative sources
- Provide balanced analysis from different angles
- Explain complex concepts clearly
- Connect findings to broader trends
- Support all claims with evidence
- Use appropriate section headers and formatting"""

    data = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": enhanced_system_prompt},
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

async def perform_deep_research(research_question: str, research_id: str, research_depth: int = 3):
    """Perform comprehensive research using multiple steps and sources."""
    log_entries = []

    try:
        # Update the state with proper research depth
        research_state[research_id] = {
            "status": "in_progress",
            "start_time": time.time(),
            "log": log_entries,
            "sources": [],
            "research_depth": research_depth  # Use the passed research depth parameter
        }

        # Step 1: Generate query variations for broader search
        log_entries.append("Generating expanded search query variations...")
        query_variations = [
            research_question,
            f"latest research on {research_question}",
            f"detailed analysis of {research_question}",
            f"{research_question} statistics and data",
            f"{research_question} expert opinions",
            f"{research_question} comprehensive overview",
            f"{research_question} current market analysis",
            f"{research_question} technical analysis",
            f"{research_question} price prediction",
            f"{research_question} news and updates",
            f"{research_question} institutional analysis",
            f"{research_question} trading patterns",
            f"{research_question} market sentiment",
            f"{research_question} fundamental analysis"
        ]

        # Step 2: Enhanced multi-source search with news integration
        log_entries.append("Searching across web, news, and specialized sources...")
        all_search_results = []

        # First, search for current news if query seems news-related
        news_keywords = ["news", "latest", "recent", "current", "today", "breaking"]
        if any(keyword in research_question.lower() for keyword in news_keywords):
            try:
                news_results = await search_newsdata(research_question, max_results=5)
                if news_results:
                    all_search_results.extend(news_results)
                    log_entries.append(f"Found {len(news_results)} recent news articles")
            except Exception as e:
                logger.error(f"News search error: {e}")

        # Then search with multiple query variations
        for idx, query in enumerate(query_variations[:8]):  # Limit to prevent overload
            try:
                search_results = await search_web(query, max_results=6)
                if search_results and isinstance(search_results, list):
                    all_search_results.extend(search_results)
                    log_entries.append(f"Query {idx+1}: Found {len(search_results)} results")
                elif search_results:
                    all_search_results.append(search_results)
            except Exception as e:
                logger.error(f"Search error for query '{query}': {e}")
                continue

            # Add small delay to prevent rate limiting
            await asyncio.sleep(0.5)

        # Step 3: Process and validate results
        sources = []
        sources_text = ""
        seen_urls = set()

        for result in all_search_results:
            try:
                # Ensure result is valid
                if not result or not isinstance(result, dict):
                    continue

                # Extract basic fields safely
                title = str(result.get("title", "Untitled")).strip()
                url = str(result.get("url", "")).strip()
                content = str(result.get("content", "")).strip()

                # Skip if no URL or duplicate
                if not url or url in seen_urls:
                    continue

                seen_urls.add(url)

                # Extract domain safely
                domain = "unknown"
                try:
                    from urllib.parse import urlparse
                    parsed = urlparse(url)
                    domain = parsed.netloc if parsed.netloc else "unknown"
                except:
                    domain = "unknown"

                # Create source object
                source = {
                    "title": title,
                    "url": url,
                    "domain": domain,
                    "content": content[:1000] if content else ""
                }
                sources.append(source)

                # Add to text for LLM (limit to first 10 sources)
                if len(sources) <= 10:
                    sources_text += f"Source {len(sources)}: {title} ({url})\n"
                    if content:
                        sources_text += f"Content: {content[:1000]}...\n\n"
                    else:
                        sources_text += "Content: [No content available]\n\n"

            except Exception as e:
                logger.error(f"Error processing search result: {e}")
                continue

        log_entries.append(f"Successfully processed {len(sources)} authentic sources.")

        # Ensure we have data to work with
        if len(sources) == 0:
            log_entries.append("No authentic sources found, generating basic analysis...")
            sources_text = f"Research topic: {research_question}\nNote: Limited source data available for this query."
        else:
            log_entries.append(f"Using {len(sources)} authentic sources for comprehensive analysis.")

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

        # Use dynamic token allocation and model selection based on research depth
        research_depth = research_state[research_id].get("research_depth", 3)  # Default to depth 3
        dynamic_token_limit = get_token_limit_by_depth(research_depth)
        logger.info(f"Using {dynamic_token_limit} tokens for research depth {research_depth}")

        # Smart model selection: Use Gemini for comprehensive Research Depth 3, DeepSeek for others
        if research_depth == 3 and dynamic_token_limit > 8192:
            logger.info(f"Using Gemini 1.5 Flash for comprehensive analysis with {dynamic_token_limit} tokens")
            report = await generate_gemini_response(system_prompt, user_prompt, max_tokens=dynamic_token_limit)
        else:
            logger.info(f"Using DeepSeek for standard analysis with {min(dynamic_token_limit, 8192)} tokens")
            report = await generate_deepseek_response(system_prompt, user_prompt, temperature=0.3, max_tokens=min(dynamic_token_limit, 8192))
        log_entries.append(f"Research report generated successfully: {len(report)} characters")

        # Step 6: Finalize research response with proper logging
        timestamp = datetime.datetime.now().isoformat()

        # Log what we're returning for debugging
        logger.info(f"Returning research response - Sources: {len(sources)}, Report length: {len(report)}")
        log_entries.append(f"Finalizing response with {len(sources)} sources and {len(report)} character report")

        response = ResearchResponse(
            status={"status": "completed", "message": "Research completed successfully"},
            report=report,
            sources=sources,
            timestamp=timestamp,
            service_process_log=log_entries
        )

        # Final validation log
        logger.info(f"Research response ready: {response.status}")
        return response

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

@app.get("/health")
async def health_check():
    """Comprehensive health check endpoint."""
    
    try:
        # Basic health indicators
        health_data = {
            "status": "ok",
            "timestamp": datetime.datetime.now().isoformat(),
            "environment": config.environment,
            "uptime": time.time(),
            "version": "1.0.0"
        }
        
        # Check API key availability
        api_status = {
            "deepseek": bool(config.api.deepseek_api_key),
            "gemini": bool(config.api.gemini_api_key),
            "tavily": bool(config.api.tavily_api_key),
            "brave": bool(config.api.brave_api_key)
        }
        health_data["api_keys"] = api_status
        
        # Get system metrics
        system_health = metrics.get_system_health()
        health_data.update(system_health)
        
        # Get error summary
        error_summary = error_handler.get_error_summary()
        health_data["error_summary"] = error_summary
        
        # Determine overall status
        if system_health.get("overall_health") == "critical" or error_summary.get("recent_errors", 0) > 10:
            health_data["status"] = "degraded"
        
        return health_data
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "error",
            "timestamp": datetime.datetime.now().isoformat(),
            "error": str(e)
        }

@app.get("/metrics")
async def get_metrics():
    """Get detailed system metrics."""
    
    try:
        metrics_data = {
            "system_metrics": metrics.get_metrics_summary(),
            "error_metrics": error_handler.get_error_summary(),
            "configuration": {
                "environment": config.environment,
                "agent_config": {
                    "max_concurrent_tasks": config.agent.max_concurrent_tasks,
                    "learning_enabled": config.agent.enable_learning,
                    "reasoning_enabled": config.agent.enable_reasoning
                },
                "cache_config": {
                    "enabled": config.cache.enabled,
                    "backend": config.cache.backend
                }
            }
        }
        
        return metrics_data
        
    except Exception as e:
        logger.error(f"Metrics collection failed: {e}")
        raise HTTPException(status_code=500, detail=f"Metrics collection failed: {str(e)}")

@app.get("/config")
async def get_configuration():
    """Get current system configuration (sanitized)."""
    
    try:
        # Return sanitized configuration (no secrets)
        sanitized_config = {
            "environment": config.environment,
            "debug": config.debug,
            "host": config.host,
            "port": config.port,
            "agent": {
                "max_concurrent_tasks": config.agent.max_concurrent_tasks,
                "default_timeout": config.agent.default_timeout,
                "memory_limit_mb": config.agent.memory_limit_mb,
                "enable_learning": config.agent.enable_learning,
                "enable_reasoning": config.agent.enable_reasoning
            },
            "cache": {
                "enabled": config.cache.enabled,
                "ttl": config.cache.ttl,
                "max_size": config.cache.max_size,
                "backend": config.cache.backend
            }
        }
        
        return sanitized_config
        
    except Exception as e:
        logger.error(f"Configuration retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=f"Configuration retrieval failed: {str(e)}")

# Adding a basic route
@app.get("/")
async def read_root():
  return {"message": "DeerFlow Research Service is running"}

if not DEEPSEEK_API_KEY:
    logger.warning("DeepSeek API key not found. LLM functionality will be unavailable.")

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

    # Perform research in the background with research depth
    background_tasks.add_task(
        perform_deep_research,
        request.research_question,
        research_id,
        int(request.research_depth or 3)
    )

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

# Full DeerFlow Agent System Endpoints

class FullAgentResearchRequest(BaseModel):
    research_question: str
    user_id: str
    complexity: Optional[str] = "auto"
    enable_multi_agent: Optional[bool] = True
    enable_reasoning: Optional[bool] = True
    preferences: Optional[Dict[str, Any]] = None

@app.post("/deerflow/full-research")
async def full_deerflow_research(request: FullAgentResearchRequest):
    """Execute research using the complete DeerFlow agent system"""
    if not FULL_DEERFLOW_AVAILABLE:
        return {"error": "Full DeerFlow agent system not available"}
    try:
        logger.info(f"Full DeerFlow research request: {request.research_question}")

        # Execute with full agent capabilities
        result = await full_agent_system.process_complex_research(
            query=request.research_question,
            user_id=request.user_id,
            preferences=request.preferences
        )

        return {
            "message": "Full DeerFlow agent research completed",
            "capabilities": [
                "Multi-agent orchestration",
                "Advanced reasoning engine", 
                "Domain expertise",
                "Tool use and integration",
                "Continuous learning"
            ],
            "result": result
        }

    except Exception as e:
        logger.error(f"Full DeerFlow research error: {e}")
        return {"error": str(e)}

@app.get("/deerflow/capabilities")
async def get_deerflow_capabilities():
    """Get information about available DeerFlow capabilities"""

    capabilities = {
        "basic_research": True,
        "agent_planning": True,
        "domain_expertise": True,
        "reasoning_engine": True,
        "learning_system": LEARNING_AVAILABLE,
        "full_agent_system": FULL_DEERFLOW_AVAILABLE
    }

    if FULL_DEERFLOW_AVAILABLE:
        capabilities.update({
            "multi_agent_orchestration": True,
            "tool_registry": True,
            "advanced_planning": True,
            "memory_persistence": True,
            "cross_session_learning": True
        })

    return {
        "service": "DeerFlow Advanced Agent System",
        "version": "1.0.0",
        "capabilities": capabilities,
        "status": "Full agent system active" if FULL_DEERFLOW_AVAILABLE else "Basic agent system active"
    }

@app.get("/deerflow/tools")
async def list_available_tools():
    """List all tools available to DeerFlow agents"""
    if not FULL_DEERFLOW_AVAILABLE:
        return {"error": "Full DeerFlow agent system not available"}

    try:
        tools_info = {}
        tool_registry = full_agent_system.orchestrator.tool_registry

        for tool_name, tool in tool_registry.tools.items():
            tools_info[tool_name] = {
                "name": tool.name,
                "description": tool.description,
                "category": tool.category,
                "parameters": tool.parameters
            }

        return {
            "available_tools": len(tools_info),
            "tool_categories": list(set(tool.category for tool in tool_registry.tools.values())),
            "tools": tools_info
        }

    except Exception as e:
        logger.error(f"Error listing tools: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    import os

    # Ensure we bind to the correct port
    port = int(os.environ.get("DEERFLOW_PORT", 9000))
    print(f"🚀 Starting DeerFlow service on 0.0.0.0:{port}")

    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=port, 
        log_level="info",
        access_log=True,
        loop="asyncio"
    )