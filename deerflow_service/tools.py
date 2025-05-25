
import asyncio
import aiohttp
import logging
import time
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Type
import backoff

logger = logging.getLogger("tools")

class BaseTool(ABC):
    """Base class for all research tools"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    @abstractmethod
    async def execute(self, query: str, **kwargs) -> Dict[str, Any]:
        """Execute the tool with given query"""
        pass
    
    @backoff.on_exception(
        backoff.expo,
        (aiohttp.ClientError, asyncio.TimeoutError),
        max_tries=3,
        max_time=30
    )
    async def _make_request(self, url: str, **kwargs) -> Dict[str, Any]:
        """Make HTTP request with retry logic"""
        try:
            async with self.session.get(url, **kwargs) as response:
                response.raise_for_status()
                return await response.json()
        except Exception as e:
            logger.error(f"Request failed: {e}")
            raise

class WebSearchTool(BaseTool):
    """Mock web search tool for demonstration"""
    
    async def execute(self, query: str, **kwargs) -> Dict[str, Any]:
        """Execute web search"""
        try:
            # Simulate search delay
            await asyncio.sleep(1)
            
            # Mock search results
            mock_results = [
                {
                    "title": f"Search result for: {query}",
                    "url": f"https://example.com/search/{query.replace(' ', '_')}",
                    "snippet": f"This is a mock search result for the query: {query}. It contains relevant information about the topic.",
                    "relevance_score": 0.8
                },
                {
                    "title": f"Another result about {query}",
                    "url": f"https://example.org/article/{query.replace(' ', '-')}",
                    "snippet": f"Additional information about {query} can be found in this comprehensive article.",
                    "relevance_score": 0.7
                }
            ]
            
            return {
                "status": "success",
                "results": mock_results,
                "total_results": len(mock_results),
                "query": query,
                "timestamp": time.time()
            }
            
        except Exception as e:
            logger.error(f"Web search failed: {e}")
            return {
                "status": "error",
                "error": str(e),
                "results": []
            }

class FinancialSearchTool(BaseTool):
    """Financial data search tool"""
    
    async def execute(self, query: str, **kwargs) -> Dict[str, Any]:
        """Execute financial search"""
        try:
            await asyncio.sleep(0.5)  # Simulate API call
            
            mock_results = [
                {
                    "title": f"Financial Analysis: {query}",
                    "url": f"https://financial-api.com/data/{query.replace(' ', '_')}",
                    "snippet": f"Current market data and analysis for {query}. Includes price trends, volume, and technical indicators.",
                    "relevance_score": 0.9,
                    "data_type": "financial"
                }
            ]
            
            return {
                "status": "success",
                "results": mock_results,
                "total_results": len(mock_results),
                "query": query,
                "timestamp": time.time()
            }
            
        except Exception as e:
            logger.error(f"Financial search failed: {e}")
            return {
                "status": "error",
                "error": str(e),
                "results": []
            }

class ToolRegistry:
    """Registry for managing available tools"""
    
    def __init__(self):
        self.tools: Dict[str, Type[BaseTool]] = {}
        self.instances: Dict[str, BaseTool] = {}
        self.configs: Dict[str, Dict[str, Any]] = {}
    
    def register(self, name: str, tool_class: Type[BaseTool], config: Dict[str, Any]):
        """Register a tool"""
        self.tools[name] = tool_class
        self.configs[name] = config
        logger.info(f"Registered tool: {name}")
    
    async def get_tool(self, name: str) -> Optional[BaseTool]:
        """Get or create tool instance"""
        if name not in self.instances:
            if name in self.tools:
                tool_class = self.tools[name]
                config = self.configs.get(name, {})
                self.instances[name] = tool_class(config)
        
        return self.instances.get(name)
    
    async def execute_tool(
        self, 
        tool_name: str, 
        query: str, 
        **kwargs
    ) -> Dict[str, Any]:
        """Execute a tool by name"""
        tool = await self.get_tool(tool_name)
        if not tool:
            return {
                "status": "error",
                "error": f"Tool {tool_name} not found"
            }
        
        try:
            async with tool:
                result = await tool.execute(query, **kwargs)
                logger.info(f"Tool {tool_name} executed successfully")
                return result
        except Exception as e:
            logger.error(f"Tool {tool_name} execution failed: {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    def get_available_tools(self) -> List[str]:
        """Get list of available tools"""
        return list(self.tools.keys())
