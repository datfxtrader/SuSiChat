"""
Custom LLM provider integration for DeepSeek.

This module integrates DeepSeek as a custom LLM provider for the minimal Suna backend.
"""

import os
import json
from typing import Dict, Any, List, Optional
import logging
import aiohttp

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
                        
                        # Format response to match expected format
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

# Initialize provider
if DEEPSEEK_API_KEY:
    logger.info("DeepSeek API key detected, provider ready")
else:
    logger.warning("No DeepSeek API key found in environment variables")