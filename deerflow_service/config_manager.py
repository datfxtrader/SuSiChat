
"""
Centralized Configuration Management for DeerFlow Agent System

This module provides a robust configuration management system that supports
environment-based configurations, validation, and hot-reloading.
"""

import os
import yaml
import json
import logging
from typing import Dict, Any, Optional, Union
from dataclasses import dataclass, asdict
from pathlib import Path

logger = logging.getLogger("config_manager")

@dataclass
class DatabaseConfig:
    """Database configuration settings"""
    host: str = "localhost"
    port: int = 5432
    database: str = "deerflow"
    username: str = ""
    password: str = ""
    pool_size: int = 10
    max_overflow: int = 20
    echo: bool = False

@dataclass
class CacheConfig:
    """Cache configuration settings"""
    enabled: bool = True
    ttl: int = 3600
    max_size: int = 1000
    backend: str = "memory"  # memory, redis
    redis_url: Optional[str] = None

@dataclass
class AgentConfig:
    """Agent system configuration"""
    max_concurrent_tasks: int = 10
    default_timeout: int = 300
    memory_limit_mb: int = 512
    enable_learning: bool = True
    enable_reasoning: bool = True

@dataclass
class APIConfig:
    """API service configuration"""
    deepseek_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    tavily_api_key: Optional[str] = None
    brave_api_key: Optional[str] = None
    rate_limit_requests: int = 100
    rate_limit_window: int = 60

@dataclass
class SystemConfig:
    """Main system configuration"""
    environment: str = "development"
    debug: bool = False
    log_level: str = "INFO"
    host: str = "0.0.0.0"
    port: int = 9000
    
    # Sub-configurations
    database: DatabaseConfig = None
    cache: CacheConfig = None
    agent: AgentConfig = None
    api: APIConfig = None
    
    def __post_init__(self):
        if self.database is None:
            self.database = DatabaseConfig()
        if self.cache is None:
            self.cache = CacheConfig()
        if self.agent is None:
            self.agent = AgentConfig()
        if self.api is None:
            self.api = APIConfig()

class ConfigManager:
    """Centralized configuration manager with validation and hot-reloading"""
    
    def __init__(self, config_path: Optional[str] = None):
        self.config_path = config_path or "config.yaml"
        self.config: SystemConfig = SystemConfig()
        self._watchers = []
        
    def load_config(self) -> SystemConfig:
        """Load configuration from file and environment variables"""
        
        # Load from file if exists
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, 'r') as f:
                    file_config = yaml.safe_load(f) or {}
                logger.info(f"Loaded configuration from {self.config_path}")
            except Exception as e:
                logger.error(f"Error loading config file: {e}")
                file_config = {}
        else:
            file_config = {}
        
        # Override with environment variables
        env_config = self._load_from_environment()
        
        # Merge configurations (env overrides file)
        merged_config = self._merge_configs(file_config, env_config)
        
        # Create and validate configuration
        self.config = self._create_config_object(merged_config)
        
        # Validate configuration
        self._validate_config()
        
        logger.info(f"Configuration loaded for environment: {self.config.environment}")
        return self.config
    
    def _load_from_environment(self) -> Dict[str, Any]:
        """Load configuration from environment variables"""
        
        env_config = {
            "environment": os.getenv("ENVIRONMENT", "development"),
            "debug": os.getenv("DEBUG", "false").lower() == "true",
            "log_level": os.getenv("LOG_LEVEL", "INFO"),
            "host": os.getenv("HOST", "0.0.0.0"),
            "port": int(os.getenv("PORT", "9000")),
            
            "database": {
                "host": os.getenv("DB_HOST", "localhost"),
                "port": int(os.getenv("DB_PORT", "5432")),
                "database": os.getenv("DB_NAME", "deerflow"),
                "username": os.getenv("DB_USER", ""),
                "password": os.getenv("DB_PASSWORD", ""),
                "pool_size": int(os.getenv("DB_POOL_SIZE", "10")),
            },
            
            "cache": {
                "enabled": os.getenv("CACHE_ENABLED", "true").lower() == "true",
                "ttl": int(os.getenv("CACHE_TTL", "3600")),
                "max_size": int(os.getenv("CACHE_MAX_SIZE", "1000")),
                "backend": os.getenv("CACHE_BACKEND", "memory"),
                "redis_url": os.getenv("REDIS_URL"),
            },
            
            "agent": {
                "max_concurrent_tasks": int(os.getenv("AGENT_MAX_TASKS", "10")),
                "default_timeout": int(os.getenv("AGENT_TIMEOUT", "300")),
                "memory_limit_mb": int(os.getenv("AGENT_MEMORY_LIMIT", "512")),
                "enable_learning": os.getenv("AGENT_LEARNING", "true").lower() == "true",
                "enable_reasoning": os.getenv("AGENT_REASONING", "true").lower() == "true",
            },
            
            "api": {
                "deepseek_api_key": os.getenv("DEEPSEEK_API_KEY"),
                "gemini_api_key": os.getenv("GEMINI_API_KEY"),
                "tavily_api_key": os.getenv("TAVILY_API_KEY"),
                "brave_api_key": os.getenv("BRAVE_API_KEY"),
                "rate_limit_requests": int(os.getenv("RATE_LIMIT_REQUESTS", "100")),
                "rate_limit_window": int(os.getenv("RATE_LIMIT_WINDOW", "60")),
            }
        }
        
        # Remove None values
        return self._clean_none_values(env_config)
    
    def _merge_configs(self, file_config: Dict, env_config: Dict) -> Dict:
        """Merge file and environment configurations"""
        
        def merge_dict(base: Dict, override: Dict) -> Dict:
            result = base.copy()
            for key, value in override.items():
                if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                    result[key] = merge_dict(result[key], value)
                else:
                    result[key] = value
            return result
        
        return merge_dict(file_config, env_config)
    
    def _create_config_object(self, config_dict: Dict) -> SystemConfig:
        """Create configuration object from dictionary"""
        
        # Create sub-configurations
        db_config = DatabaseConfig(**config_dict.get("database", {}))
        cache_config = CacheConfig(**config_dict.get("cache", {}))
        agent_config = AgentConfig(**config_dict.get("agent", {}))
        api_config = APIConfig(**config_dict.get("api", {}))
        
        # Create main configuration
        main_config = {k: v for k, v in config_dict.items() 
                      if k not in ["database", "cache", "agent", "api"]}
        
        return SystemConfig(
            **main_config,
            database=db_config,
            cache=cache_config,
            agent=agent_config,
            api=api_config
        )
    
    def _validate_config(self):
        """Validate configuration settings"""
        
        errors = []
        
        # Validate required API keys based on environment
        if self.config.environment == "production":
            if not self.config.api.deepseek_api_key:
                errors.append("DeepSeek API key is required in production")
        
        # Validate port range
        if not (1024 <= self.config.port <= 65535):
            errors.append(f"Port {self.config.port} is outside valid range (1024-65535)")
        
        # Validate cache configuration
        if self.config.cache.backend == "redis" and not self.config.cache.redis_url:
            errors.append("Redis URL is required when using Redis cache backend")
        
        # Validate agent limits
        if self.config.agent.max_concurrent_tasks < 1:
            errors.append("Agent max_concurrent_tasks must be at least 1")
        
        if errors:
            raise ValueError(f"Configuration validation failed: {'; '.join(errors)}")
        
        logger.info("Configuration validation passed")
    
    def _clean_none_values(self, data: Union[Dict, Any]) -> Union[Dict, Any]:
        """Remove None values from nested dictionaries"""
        
        if isinstance(data, dict):
            return {k: self._clean_none_values(v) for k, v in data.items() if v is not None}
        return data
    
    def save_config(self, config_path: Optional[str] = None):
        """Save current configuration to file"""
        
        path = config_path or self.config_path
        config_dict = asdict(self.config)
        
        try:
            with open(path, 'w') as f:
                yaml.dump(config_dict, f, default_flow_style=False, indent=2)
            logger.info(f"Configuration saved to {path}")
        except Exception as e:
            logger.error(f"Error saving configuration: {e}")
            raise
    
    def get_config(self) -> SystemConfig:
        """Get current configuration"""
        return self.config
    
    def update_config(self, updates: Dict[str, Any]):
        """Update configuration with new values"""
        
        # Apply updates to current config
        config_dict = asdict(self.config)
        merged = self._merge_configs(config_dict, updates)
        
        # Recreate and validate
        self.config = self._create_config_object(merged)
        self._validate_config()
        
        logger.info("Configuration updated successfully")
    
    def get_section(self, section: str) -> Any:
        """Get a specific configuration section"""
        
        sections = {
            "database": self.config.database,
            "cache": self.config.cache,
            "agent": self.config.agent,
            "api": self.config.api
        }
        
        return sections.get(section, getattr(self.config, section, None))

# Global configuration manager instance
config_manager = ConfigManager()

def get_config() -> SystemConfig:
    """Get the global configuration"""
    return config_manager.get_config()

def load_config(config_path: Optional[str] = None) -> SystemConfig:
    """Load configuration from file and environment"""
    if config_path:
        config_manager.config_path = config_path
    return config_manager.load_config()
