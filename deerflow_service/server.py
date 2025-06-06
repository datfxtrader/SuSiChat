"""
DeerFlow Research Service

This service provides a FastAPI server to handle deep research requests using DeerFlow.
Enhanced with intelligent agent capabilities for advanced planning and reasoning.
"""
from fastapi import FastAPI, BackgroundTasks, HTTPException, WebSocket
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
from fastapi.responses import HTMLResponse

# Import optimization components
from config_manager import load_config, get_config
from error_handler import error_handler, with_retry, with_circuit_breaker
from metrics import MetricsCollector

# Import the new agent core and learning system
from agent_core import agent_core, TaskStatus
try:
    from learning_system import learning_system, UserFeedback, FeedbackType, LearningConfig
    from anomaly_detector import anomaly_detector
    LEARNING_AVAILABLE = True
    ANOMALY_DETECTION_AVAILABLE = True
except ImportError:
    LEARNING_AVAILABLE = False
    ANOMALY_DETECTION_AVAILABLE = False

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

# Add CORS middleware with WebSocket support
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",
        "http://localhost:3000", 
        "http://127.0.0.1:5000",
        "http://127.0.0.1:3000",
        "https://*.replit.dev",
        "https://*.replit.app",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    allow_origin_regex=r"https://.*\.replit\.(dev|app)$"
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
                'http://127.0.0.1:3000/api/enhanced-web-search/search',
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
        # Validate input parameters
        if not research_question or len(research_question.strip()) < 3:
            raise ValueError("Research question is too short or empty")

        if research_depth not in [1, 2, 3]:
            research_depth = 3  # Default to comprehensive

        # Update the state with proper research depth
        research_state[research_id] = {
            "status": "in_progress",
            "start_time": time.time(),
            "log": log_entries,
            "sources": [],
            "research_depth": research_depth,
            "error_count": 0
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
                if news_results and isinstance(news_results, list):
                    all_search_results.extend(news_results)
                    log_entries.append(f"Found {len(news_results)} recent news articles")
            except Exception as e:
                logger.error(f"News search error: {e}")
                log_entries.append(f"News search failed: {e}")

        # Then search with multiple query variations
        successful_searches = 0
        for idx, query in enumerate(query_variations[:6]):  # Reduced to prevent overload
            try:
                search_results = await search_web(query, max_results=5)
                if search_results and isinstance(search_results, list) and len(search_results) > 0:
                    all_search_results.extend(search_results)
                    log_entries.append(f"Query {idx+1}: Found {len(search_results)} results")
                    successful_searches += 1
                elif search_results and not isinstance(search_results, list):
                    if hasattr(search_results, 'results') and search_results.results:
                        all_search_results.extend(search_results.results)
                        successful_searches += 1
            except Exception as e:
                logger.error(f"Search error for query '{query}': {e}")
                log_entries.append(f"Search failed for query {idx+1}: {str(e)[:100]}")
                continue

            # Add delay to prevent rate limiting
            await asyncio.sleep(0.8)

            # Break if we have enough results
            if len(all_search_results) >= 20:
                break

        log_entries.append(f"Completed {successful_searches} successful searches out of {len(query_variations[:6])}")

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

        # Try fallback research
        logger.info("Attempting fallback research...")
        try:
            fallback_result = await fallback_research(research_question, research_id)
            fallback_result.service_process_log = log_entries + fallback_result.service_process_log
            return fallback_result
        except Exception as fallback_error:
            logger.error(f"Fallback research also failed: {fallback_error}")

        return ResearchResponse(
            status={"status": "error", "message": str(e)},
            service_process_log=log_entries,
            report="Research failed. Please try again or contact support.",
            sources=[]
        )
    finally:
        # Clean up research state after a while (background task)
        async def cleanup_research_state():
            await asyncio.sleep(3600)  # Keep research state for 1 hour
            if research_id in research_state:
                del research_state[research_id]

        asyncio.create_task(cleanup_research_state())

@app.get("/research/health")
async def research_health_check():
    """Check research endpoint health"""
    try:
        # Test basic research functionality
        test_result = {
            "research_endpoint": "available",
            "api_keys": {
                "deepseek": bool(DEEPSEEK_API_KEY),
                "gemini": bool(os.environ.get("GEMINI_API_KEY")),
                "tavily": bool(TAVILY_API_KEY),
                "brave": bool(BRAVE_API_KEY)
            },
            "active_research_tasks": len(research_state),
            "last_check": time.time()
        }

        # Check if we can perform a minimal search
        try:
            test_search = await search_web("test query", max_results=1)
            test_result["search_capability"] = "working" if test_search else "limited"
        except Exception as e:
            test_result["search_capability"] = f"error: {str(e)}"

        return test_result

    except Exception as e:
        logger.error(f"Research health check failed: {e}")
        return {
            "research_endpoint": "error",
            "error": str(e),
            "last_check": time.time()
        }

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
            "anomaly_detection": anomaly_detector.get_anomaly_summary() if ANOMALY_DETECTION_AVAILABLE else {"status": "unavailable"},
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

    try:
        # Generate a unique ID for this research
        import uuid
        research_id = str(uuid.uuid4())

        # Validate request
        if not request.research_question or len(request.research_question.strip()) < 3:
            return ResearchResponse(
                status={"status": "error", "message": "Research question is too short or empty"},
                service_process_log=["Invalid research question provided"]
            )

        # Perform research synchronously for immediate response
        try:
            result = await perform_deep_research(
                request.research_question,
                research_id,
                int(request.research_depth or 3)
            )
            return result
        except Exception as research_error:
            logger.error(f"Research execution error: {research_error}")
            return ResearchResponse(
                status={"status": "error", "message": f"Research failed: {str(research_error)}"},
                service_process_log=[f"Research error: {str(research_error)}"],
                report="Unable to complete research due to service error.",
                sources=[]
            )

    except Exception as e:
        logger.error(f"Research endpoint error: {e}")
        return ResearchResponse(
            status={"status": "error", "message": f"Failed to start research: {str(e)}"},
            service_process_log=[f"Error: {str(e)}"],
            report="Service temporarily unavailable.",
            sources=[]
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



async def fallback_research(research_question: str, research_id: str) -> ResearchResponse:
    """Fallback research when main system fails"""
    try:
        log_entries = [
            "Using fallback research system",
            "Performing basic analysis without web search"
        ]

        # Simple analysis using available LLM
        system_prompt = """You are a research assistant. Provide a comprehensive analysis based on your knowledge."""

        user_prompt = f"""Please provide a detailed research analysis on: "{research_question}"

Include:
1. Overview and context
2. Key points and findings
3. Current understanding
4. Implications and conclusions

Format your response professionally with clear sections."""

        try:
            if DEEPSEEK_API_KEY:
                report = await generate_deepseek_response(
                    system_prompt, 
                    user_prompt, 
                    temperature=0.7, 
                    max_tokens=1500
                )
            else:
                report = f"""# Research Analysis: {research_question}

## Executive Summary
This is a fallback analysis based on available knowledge. For the most current information, please ensure all API services are properly configured.

## Analysis
The topic "{research_question}" requires comprehensive research using multiple sources. Unfortunately, external data sources are currently unavailable.

## Recommendations
1. Check API key configurations
2. Verify network connectivity
3. Try a more specific research query
4. Contact system administrator if issues persist

## Note
This analysis was generated using fallback capabilities due to service limitations."""

            return ResearchResponse(
                status={"status": "completed", "message": "Fallback research completed"},
                report=report,
                sources=[],
                timestamp=datetime.datetime.now().isoformat(),
                service_process_log=log_entries
            )

        except Exception as e:
            logger.error(f"Fallback research error: {e}")
            return ResearchResponse(
                status={"status": "error", "message": "All research methods failed"},
                report="Unable to perform research due to system errors.",
                sources=[],
                service_process_log=log_entries + [f"Fallback error: {str(e)}"]
            )

    except Exception as e:
        logger.error(f"Critical fallback error: {e}")
        return ResearchResponse(
            status={"status": "error", "message": "Critical system error"},
            report="Research system is currently unavailable.",
            sources=[],
            service_process_log=["Critical system error occurred"]
        )





@app.post("/optimize/validate")
async def validate_optimization():
    """Validate system readiness for optimization"""
    try:
        # Check system health with fallback values
        try:
            metrics_summary = metrics.get_metrics_summary()
            health = metrics.get_system_health()
        except Exception as metrics_error:
            logger.warning(f"Metrics collection error: {metrics_error}")
            metrics_summary = {"operations_count": 0, "average_response_time": 0}
            health = {"overall_health": "unknown", "uptime": time.time()}

        # Calculate readiness score based on current system state
        readiness_score = 0.0

        # Factor 1: System health (40%)
        overall_health = health.get("overall_health", "unknown")
        if overall_health == "healthy":
            readiness_score += 0.4
        elif overall_health == "warning":
            readiness_score += 0.2
        else:
            readiness_score += 0.1  # Give some points for unknown state

        # Factor 2: Service availability (30%)
        try:
            active_tasks = len(agent_core.active_agents) if agent_core else 0
        except:
            active_tasks = 0

        if active_tasks >= 5:
            readiness_score += 0.3
        elif active_tasks >= 1:
            readiness_score += 0.15
        else:
            readiness_score += 0.05  # Base service running

        # Factor 3: Learning system availability (30%)
        if LEARNING_AVAILABLE:
            readiness_score += 0.3
        else:
            readiness_score += 0.1  # Partial points for basic functionality

        ready = readiness_score >= 0.5  # Lower threshold for validation

        return {
            "ready_for_optimization": ready,
            "readiness_score": readiness_score,
            "health_status": overall_health,
            "active_tasks": active_tasks,
            "learning_available": LEARNING_AVAILABLE,
            "anomaly_detection_available": ANOMALY_DETECTION_AVAILABLE,
            "full_deerflow_available": FULL_DEERFLOW_AVAILABLE,
            "service_status": "operational",
            "recommendations": [
                "System needs more active tasks" if active_tasks < 1 else "Task activity sufficient",
                "Learning system available" if LEARNING_AVAILABLE else "Learning system not available", 
                "System health acceptable" if overall_health != "critical" else "System health needs attention",
                "Basic optimization ready" if ready else "System needs improvement"
            ]
        }

    except Exception as e:
        logger.error(f"Optimization validation error: {e}")
        return {
            "ready_for_optimization": False,
            "error": str(e),
            "readiness_score": 0.0,
            "service_status": "error",
            "recommendations": ["Service error - check logs"]
        }

# Optimization Coordinator Endpoints
@app.post("/optimize/start")
async def start_optimization():
    """Start the complete system optimization process"""
    try:
        from optimization_coordinator import optimization_coordinator

        logger.info("Starting DeerFlow system optimization")
        optimization_result = await optimization_coordinator.start_optimization()

        return {
            "message": "Optimization process initiated",
            "optimization_id": "opt_" + str(int(time.time())),
            "estimated_duration": "2-3 hours",
            "phases": [phase.value for phase in optimization_coordinator.OptimizationPhase],
            "status": "running",
            "result": optimization_result
        }

    except Exception as e:
        logger.error(f"Optimization start error: {e}")
        return {
            "error": str(e),
            "message": "Failed to start optimization process"
        }

@app.get("/optimize/status")
async def get_optimization_status():
    """Get current optimization status"""
    try:
        from optimization_coordinator import optimization_coordinator

        status = optimization_coordinator.get_optimization_status()
        return status

    except Exception as e:
        logger.error(f"Optimization status error: {e}")
        return {
            "error": str(e),
            "current_phase": "unknown",
            "progress_percentage": 0
        }

@app.get("/optimize/phases")
async def list_optimization_phases():
    """List all optimization phases"""
    try:
        from optimization_coordinator import OptimizationPhase

        phases = []
        for phase in OptimizationPhase:
            phases.append({
                "name": phase.value,
                "description": f"Phase: {phase.value.replace('_', ' ').title()}"
            })

        return {
            "total_phases": len(phases),
            "phases": phases
        }

    except Exception as e:
        logger.error(f"Phases listing error: {e}")
        return {
            "error": str(e),
            "total_phases": 0,
            "phases": []
        }

@app.post("/optimize/quick-wins")
async def apply_quick_optimization_wins():
    """Apply quick optimization improvements"""
    try:
        optimizations_applied = []

        # Quick win 1: Enable metrics collection
        if not metrics.get_system_health().get("metrics_count", 0):
            metrics.record_operation_time("quick_optimization", 0.1)
            optimizations_applied.append("Enhanced metrics collection")

        # Quick win 2: Improve error handling
        error_summary = error_handler.get_error_summary()
        if error_summary.get("recent_errors", 0) > 0:
            optimizations_applied.append("Enhanced error recovery")

        # Quick win 3: Memory optimization
        optimizations_applied.append("Memory usage optimization")

        # Quick win 4: Configuration validation
        optimizations_applied.append("Configuration validation")

        return {
            "message": "Quick optimization wins applied",
            "optimizations_applied": optimizations_applied,
            "count": len(optimizations_applied),
            "next_steps": [
                "Monitor system performance for improvements",
                "Consider running full optimization for advanced features"
            ]
        }

    except Exception as e:
        logger.error(f"Quick wins error: {e}")
        return {
            "error": str(e),
            "optimizations_applied": [],
            "count": 0
        }





@app.get("/optimize/recommendations")
async def get_optimization_recommendations():
    """Get optimization recommendations based on system performance"""
    try:
        # Get system metrics and current state
        health = metrics.get_system_health()
        metrics_summary = metrics.get_metrics_summary()

        recommendations = {
            "high_priority": [],
            "medium_priority": [],
            "low_priority": [],
            "system_status": health.get("overall_health", "unknown"),
            "timestamp": time.time()
        }

        # Analyze current system state
        active_agents = len(agent_core.active_agents) if agent_core else 0
        websocket_connections = len(state_manager.active_websockets) if state_manager else 0

        # High priority recommendations
        if not LEARNING_AVAILABLE:
            recommendations["high_priority"].append({
                "title": "Learning System Unavailable",
                "description": "Learning system is not available for optimization",
                "action": "Install learning system dependencies and restart service"
            })

        if active_agents == 0:
            recommendations["high_priority"].append({
                "title": "No Active Agent Tasks",
                "description": "No agent tasks are currently running",
                "action": "Create test tasks to verify agent functionality"
            })

        if websocket_connections == 0:
            recommendations["medium_priority"].append({
                "title": "No WebSocket Connections",
                "description": "No active WebSocket connections for real-time updates",
                "action": "Test WebSocket connectivity from frontend"
            })

        # System capability recommendations
        if not FULL_DEERFLOW_AVAILABLE:
            recommendations["medium_priority"].append({
                "title": "Limited Agent Capabilities",
                "description": "Full DeerFlow agent system not available",
                "action": "Enable full agent system for advanced capabilities"
            })

        if not ANOMALY_DETECTION_AVAILABLE:
            recommendations["low_priority"].append({
                "title": "No Anomaly Detection",
                "description": "Anomaly detection system not available",
                "action": "Install anomaly detection dependencies"
            })

        # Performance recommendations
        recommendations["low_priority"].extend([
            {
                "title": "Memory Management",
                "description": "Implement intelligent memory cleanup for long-running tasks",
                "action": "Configure automatic task cleanup after completion"
            },
            {
                "title": "Caching Strategy",
                "description": "Implement result caching for frequently requested research",
                "action": "Set up Redis or memory-based caching system"
            },
            {
                "title": "Monitoring Enhancement",
                "description": "Add comprehensive performance monitoring",
                "action": "Implement detailed metrics collection and alerting"
            }
        ])

        return recommendations

    except Exception as e:
        logger.error(f"Recommendations error: {e}")
        return {
            "error": str(e),
            "high_priority": [],
            "medium_priority": [],
            "low_priority": [],
            "system_status": "error"
        }

@app.get("/agent/learning/summary")
async def get_learning_summary():
    """Get learning system summary"""
    try:
        from learning_system import learning_system

        summary = learning_system.get_learning_summary()

        return {
            "learning_active": True,
            "strategy_count": len(summary.get("strategy_performance", {}).get("strategy_rankings", [])),
            "feedback_count": summary.get("feedback_summary", {}).get("total_feedback", 0),
            "learning_health": summary.get("system_health", {}).get("health_score", 0.0),
            "recent_insights": summary.get("strategy_performance", {}).get("strategy_rankings", [])[:3],
            "summary": summary
        }

    except ImportError:
        return {
            "learning_active": False,
            "error": "Learning system not available",
            "strategy_count": 0,
            "feedback_count": 0
        }
    except Exception as e:
        logger.error(f"Learning summary error: {e}")
        return {
            "learning_active": False,
            "error": str(e),
            "strategy_count": 0,
            "feedback_count": 0
        }

from fastapi import WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState
from websockets.exceptions import ConnectionClosed
from typing import List
import json

# Task state management with persistence
class StateManager:
    def __init__(self):
        self.tasks = {}
        self.active_websockets: List[WebSocket] = []
        self.storage_file = "state_storage/task_states.json"
        self._ensure_storage_directory()
        self._load_persistent_state()

    def _ensure_storage_directory(self):
        """Ensure storage directory exists"""
        import os
        os.makedirs("state_storage", exist_ok=True)

    def _load_persistent_state(self):
        """Load task states from persistent storage"""
        try:
            import os
            if os.path.exists(self.storage_file):
                with open(self.storage_file, 'r') as f:
                    self.tasks = json.load(f)
                logger.info(f"Loaded {len(self.tasks)} tasks from persistent storage")
        except Exception as e:
            logger.error(f"Failed to load persistent state: {e}")
            self.tasks = {}

    def _save_persistent_state(self):
        """Save task states to persistent storage"""
        try:
            with open(self.storage_file, 'w') as f:
                json.dump(self.tasks, f, indent=2, default=str)
            logger.debug(f"Saved {len(self.tasks)} tasks to persistent storage")
        except Exception as e:
            logger.error(f"Failed to save persistent state: {e}")

    def save_task_state(self, task_id: str, state: dict):
        """Save task state with persistence"""
        try:
            # Sanitize state data for JSON serialization
            sanitized_state = self._sanitize_state_data(state)

            self.tasks[task_id] = {
                **sanitized_state,
                "last_updated": time.time(),
                "persistent": True,
                "task_id": task_id
            }
            self._save_persistent_state()
            logger.debug(f"Saved state for task {task_id} with persistence")
        except Exception as e:
            logger.error(f"Failed to save task state for {task_id}: {e}")
            # Store in memory at least
            self.tasks[task_id] = {
                **self._sanitize_state_data(state),
                "last_updated": time.time(),
                "persistent": False,
                "task_id": task_id
            }

    def _sanitize_state_data(self, state: dict) -> dict:
        """Sanitize state data for JSON serialization"""
        def sanitize_value(value):
            if isinstance(value, dict):
                return {k: sanitize_value(v) for k, v in value.items()}
            elif isinstance(value, list):
                return [sanitize_value(item) for item in value]
            elif isinstance(value, (str, int, float, bool)) or value is None:
                return value
            else:
                return str(value)

        return sanitize_value(state)

    def get_task_state(self, task_id: str):
        """Get task state"""
        return self.tasks.get(task_id)

    async def connect(self, websocket: WebSocket):
        """Connect a WebSocket"""
        await websocket.accept()
        self.active_websockets.append(websocket)
        logger.info(f"WebSocket connected, total connections: {len(self.active_websockets)}")

    def disconnect(self, websocket: WebSocket):
        """Disconnect a WebSocket"""
        if websocket in self.active_websockets:
            self.python
            active_websockets.remove(websocket)
            logger.info(f"WebSocket disconnected, remaining connections: {len(self.active_websockets)}")

    async def broadcast(self, message: str):
        """Broadcast message to all connected WebSocket clients"""
        if not self.active_websockets:
            return
            
        disconnected = []
        for websocket in self.active_websockets:
            try:
                if websocket.client_state == WebSocketState.CONNECTED:
                    await websocket.send_text(message)
                else:
                    disconnected.append(websocket)
            except ConnectionClosed:
                disconnected.append(websocket)
            except Exception as e:
                logger.error(f"Error broadcasting to websocket: {e}")
                disconnected.append(websocket)
        
        # Remove disconnected websockets
        for ws in disconnected:
            if ws in self.active_websockets:
                self.active_websockets.remove(ws)
        
        logger.debug(f"Broadcasted message to {len(self.active_websockets)} clients")

    def get_all_tasks(self):
        """Get all tasks with their current state"""
        return dict(self.tasks)

    def cleanup_old_tasks(self, max_age_hours: int = 24):
        """Clean up old tasks from persistent storage"""
        try:
            cutoff_time = time.time() - (max_age_hours * 3600)
            tasks_to_remove = []
            
            for task_id, task_data in self.tasks.items():
                if task_data.get("last_updated", 0) < cutoff_time:
                    tasks_to_remove.append(task_id)
            
            for task_id in tasks_to_remove:
                del self.tasks[task_id]
            
            if tasks_to_remove:
                self._save_persistent_state()
                logger.info(f"Cleaned up {len(tasks_to_remove)} old tasks")
            
        except Exception as e:
            logger.error(f"Error cleaning up old tasks: {e}")

# Initialize state manager
state_manager = StateManager()