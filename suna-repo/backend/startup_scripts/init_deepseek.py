"""
Initialization script for DeepSeek LLM provider.

This script is executed during Suna startup to register the DeepSeek provider.
"""

import logging
import os
from utils.custom_llm_provider import register_deepseek_provider

logger = logging.getLogger(__name__)

def initialize():
    """Initialize the DeepSeek provider during startup."""
    # Copy the API key from the environment
    os.environ['DEEPSEEK_API_KEY'] = os.environ.get('DEEPSEEK_API_KEY', '')
    
    # Register the DeepSeek provider
    register_deepseek_provider()
    
    logger.info("DeepSeek provider initialization complete")

# Run initialization when imported
initialize()