"""
Custom LLM provider integration for DeepSeek.

This module integrates DeepSeek as a custom LLM provider for Suna.
"""

import os
import json
from typing import Dict, Any, List, Optional
import logging
import aiohttp
from utils.config import config

logger = logging.getLogger(__name__)

DEEPSEEK_API_ENDPOINT = os.environ.get('DEEPSEEK_API_ENDPOINT', 'https://api.deepseek.com/v1/chat/completions')
DEEPSEEK_MODEL = os.environ.get('DEEPSEEK_MODEL', 'deepseek-chat')
DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY', '')

class DeepSeekProvider:
    """DeepSeek LLM provider for Suna."""

    @staticmethod
    async def generate_response(
        messages: List[Dict[str, str]], 
        temperature: float = 0.7,
        max_tokens: int = 4000,
        stream: bool = False,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate a response from the DeepSeek API.
        
        Args:
            messages: List of message objects with role and content
            temperature: Controls randomness, lower is more deterministic
            max_tokens: Maximum tokens to generate
            stream: Whether to stream the response
            **kwargs: Additional arguments to pass to the API
            
        Returns:
            Dictionary containing the generated content
        """
        try:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
            }

            payload = {
                "model": DEEPSEEK_MODEL,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": stream
            }
            
            # Add any additional parameters
            for key, value in kwargs.items():
                if key not in payload:
                    payload[key] = value

            logger.debug(f"Sending request to DeepSeek API: {json.dumps(payload, indent=2)}")

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    DEEPSEEK_API_ENDPOINT,
                    headers=headers,
                    json=payload
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"DeepSeek API error: {response.status} - {error_text}")
                        raise Exception(f"DeepSeek API error: {response.status} - {error_text}")
                    
                    if stream:
                        # TODO: Implement streaming
                        pass
                    else:
                        response_json = await response.json()
                        logger.debug(f"Received response from DeepSeek API: {json.dumps(response_json, indent=2)}")
                        
                        # Format response to match expected format from other providers
                        return {
                            "id": response_json.get("id", ""),
                            "choices": [
                                {
                                    "message": {
                                        "role": "assistant",
                                        "content": response_json["choices"][0]["message"]["content"]
                                    },
                                    "finish_reason": response_json["choices"][0].get("finish_reason", "stop")
                                }
                            ],
                            "usage": response_json.get("usage", {})
                        }
                    
        except Exception as e:
            logger.error(f"Error calling DeepSeek API: {str(e)}")
            raise

# Register this provider with litellm or other model providers
def register_deepseek_provider():
    """Register DeepSeek provider with Suna's LLM manager."""
    try:
        from agentpress.llm_manager import register_custom_provider
        
        # Register the DeepSeek provider
        register_custom_provider("deepseek", DeepSeekProvider.generate_response)
        logger.info("DeepSeek provider registered successfully")
    except ImportError:
        logger.warning("Could not register DeepSeek provider - agentpress.llm_manager not available")
    except Exception as e:
        logger.error(f"Error registering DeepSeek provider: {str(e)}")

# Initialize when this module is imported
if DEEPSEEK_API_KEY:
    logger.info("DeepSeek API key detected, initializing provider")
else:
    logger.warning("No DeepSeek API key found in environment variables")