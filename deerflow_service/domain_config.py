
"""
Optimized Domain Configuration Management

This module provides advanced configuration management with schema validation,
hot reloading, environment variable support, configuration inheritance, and caching.
"""

import asyncio
import yaml
import json
import os
import logging
import re
import time
import hashlib
import copy
from typing import Dict, Any, Optional, List, Set, Callable, Union, Tuple, FrozenSet
from pathlib import Path
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from functools import lru_cache
from abc import ABC, abstractmethod

# Pydantic for validation
try:
    from pydantic import BaseModel, Field, validator
    PYDANTIC_AVAILABLE = True
except ImportError:
    PYDANTIC_AVAILABLE = False
    # Fallback base class
    class BaseModel:
        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                setattr(self, key, value)
        
        def dict(self):
            return {k: v for k, v in self.__dict__.items() if not k.startswith('_')}

# File watching
try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler, FileModifiedEvent
    WATCHDOG_AVAILABLE = True
except ImportError:
    WATCHDOG_AVAILABLE = False
    class FileSystemEventHandler:
        pass

logger = logging.getLogger("domain_config")

class KeywordCategory(str, Enum):
    PRIMARY = "primary"
    SECONDARY = "secondary"
    CONTEXTUAL = "contextual"

class ThresholdConfig(BaseModel):
    """Validated threshold configuration"""
    relevance_score: float = 0.5
    confidence_threshold: float = 0.6
    min_evidence_count: int = 3
    risk_score_threshold: float = 0.7
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if PYDANTIC_AVAILABLE:
            # Validate ranges
            for attr in ['relevance_score', 'confidence_threshold', 'risk_score_threshold']:
                value = getattr(self, attr, 0.5)
                if not 0.0 <= value <= 1.0:
                    logger.warning(f"{attr} should be between 0.0 and 1.0, got {value}")
                    setattr(self, attr, max(0.0, min(1.0, value)))

class KeywordConfig(BaseModel):
    """Validated keyword configuration"""
    primary: List[str] = []
    secondary: List[str] = []
    contextual: List[str] = []
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Remove empty strings and duplicates
        for attr in ['primary', 'secondary', 'contextual']:
            value = getattr(self, attr, [])
            if isinstance(value, list):
                setattr(self, attr, list(set(filter(None, value))))

class DomainConfigSchema(BaseModel):
    """Schema for domain configuration"""
    keywords: KeywordConfig
    thresholds: ThresholdConfig
    analysis_patterns: Dict[str, List[str]] = {}
    enabled: bool = True
    priority: int = 5
    
    def __init__(self, **kwargs):
        # Handle nested configurations
        if 'keywords' in kwargs and isinstance(kwargs['keywords'], dict):
            kwargs['keywords'] = KeywordConfig(**kwargs['keywords'])
        elif 'keywords' not in kwargs:
            kwargs['keywords'] = KeywordConfig()
            
        if 'thresholds' in kwargs and isinstance(kwargs['thresholds'], dict):
            kwargs['thresholds'] = ThresholdConfig(**kwargs['thresholds'])
        elif 'thresholds' not in kwargs:
            kwargs['thresholds'] = ThresholdConfig()
            
        super().__init__(**kwargs)

class GlobalConfigSchema(BaseModel):
    """Schema for global configuration"""
    cache_size: int = 128
    max_concurrent_analyses: int = 5
    error_threshold: int = 10
    config_reload_interval: int = 300
    enable_hot_reload: bool = True
    performance_monitoring: bool = True
    detailed_logging: bool = False
    
    timeouts: Dict[str, int] = {
        'analysis_timeout': 30,
        'evidence_processing_timeout': 60,
        'orchestration_timeout': 120
    }
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Ensure positive values
        for attr in ['cache_size', 'max_concurrent_analyses']:
            value = getattr(self, attr, 1)
            if value < 1:
                setattr(self, attr, 1)

class ConfigValidator:
    """Validates configuration against schemas"""
    
    @staticmethod
    def validate_domain_config(config: Dict[str, Any]) -> DomainConfigSchema:
        """Validate and parse domain configuration"""
        try:
            return DomainConfigSchema(**config)
        except Exception as e:
            logger.error(f"Domain config validation failed: {e}")
            return DomainConfigSchema()
    
    @staticmethod
    def validate_global_config(config: Dict[str, Any]) -> GlobalConfigSchema:
        """Validate and parse global configuration"""
        try:
            return GlobalConfigSchema(**config)
        except Exception as e:
            logger.error(f"Global config validation failed: {e}")
            return GlobalConfigSchema()
    
    @staticmethod
    def validate_full_config(config: Dict[str, Any]) -> Dict[str, Any]:
        """Validate entire configuration"""
        validated = {}
        
        # Validate global config
        if "global" in config:
            validated["global"] = ConfigValidator.validate_global_config(
                config["global"]
            ).dict()
        
        # Validate each domain config
        for domain, domain_config in config.items():
            if domain != "global":
                try:
                    validated[domain] = ConfigValidator.validate_domain_config(
                        domain_config
                    ).dict()
                except Exception as e:
                    logger.error(f"Invalid configuration for domain {domain}: {e}")
                    validated[domain] = DomainConfigSchema().dict()
        
        return validated

class EnvironmentResolver:
    """Resolves environment variables in configuration"""
    
    ENV_VAR_PATTERN = re.compile(r'\${([^}]+)}')
    
    @classmethod
    def resolve_value(cls, value: Any) -> Any:
        """Resolve environment variables in a value"""
        if isinstance(value, str):
            return cls._resolve_string(value)
        elif isinstance(value, dict):
            return {k: cls.resolve_value(v) for k, v in value.items()}
        elif isinstance(value, list):
            return [cls.resolve_value(item) for item in value]
        return value
    
    @classmethod
    def _resolve_string(cls, value: str) -> Union[str, int, float, bool]:
        """Resolve environment variables in a string"""
        def replacer(match):
            env_var = match.group(1)
            default = None
            
            # Support default values: ${VAR_NAME:default_value}
            if ':' in env_var:
                env_var, default = env_var.split(':', 1)
            
            env_value = os.environ.get(env_var, default)
            
            if env_value is None:
                logger.warning(f"Environment variable {env_var} not found")
                return match.group(0)  # Return original if not found
            
            return env_value
        
        resolved = cls.ENV_VAR_PATTERN.sub(replacer, value)
        
        # Try to convert to appropriate type
        if resolved.lower() in ('true', 'false'):
            return resolved.lower() == 'true'
        
        try:
            return int(resolved)
        except ValueError:
            try:
                return float(resolved)
            except ValueError:
                return resolved
    
    @classmethod
    def resolve_config(cls, config: Dict[str, Any]) -> Dict[str, Any]:
        """Resolve all environment variables in configuration"""
        return cls.resolve_value(config)

class ConfigurationSource(ABC):
    """Abstract base for configuration sources"""
    
    @abstractmethod
    async def load(self) -> Dict[str, Any]:
        """Load configuration from source"""
        pass
    
    @abstractmethod
    def get_priority(self) -> int:
        """Get source priority (higher = higher priority)"""
        pass

class FileConfigSource(ConfigurationSource):
    """File-based configuration source"""
    
    def __init__(self, file_path: Path, priority: int = 0):
        self.file_path = file_path
        self.priority = priority
    
    async def load(self) -> Dict[str, Any]:
        """Load configuration from file"""
        if not self.file_path.exists():
            return {}
        
        try:
            with open(self.file_path, 'r', encoding='utf-8') as f:
                if self.file_path.suffix in ['.yaml', '.yml']:
                    return yaml.safe_load(f) or {}
                elif self.file_path.suffix == '.json':
                    return json.load(f)
                else:
                    logger.warning(f"Unsupported file format: {self.file_path.suffix}")
                    return {}
        except Exception as e:
            logger.error(f"Failed to load config from {self.file_path}: {e}")
            return {}
    
    def get_priority(self) -> int:
        return self.priority

class EnvironmentConfigSource(ConfigurationSource):
    """Environment variable configuration source"""
    
    def __init__(self, prefix: str = "DOMAIN_", priority: int = 10):
        self.prefix = prefix
        self.priority = priority
    
    async def load(self) -> Dict[str, Any]:
        """Load configuration from environment variables"""
        config = {}
        
        for key, value in os.environ.items():
            if key.startswith(self.prefix):
                # Convert DOMAIN_FINANCIAL_KEYWORDS_PRIMARY to financial.keywords.primary
                path = key[len(self.prefix):].lower().split('_')
                self._set_nested_value(config, path, value)
        
        return config
    
    def _set_nested_value(self, config: Dict, path: List[str], value: str):
        """Set a value in nested dictionary using path"""
        current = config
        for i, key in enumerate(path[:-1]):
            if key not in current:
                current[key] = {}
            current = current[key]
        
        # Try to parse value
        try:
            current[path[-1]] = json.loads(value)
        except json.JSONDecodeError:
            current[path[-1]] = value
    
    def get_priority(self) -> int:
        return self.priority

class ConfigurationManager:
    """Manages configuration from multiple sources with inheritance"""
    
    def __init__(self):
        self.sources: List[ConfigurationSource] = []
        self.merged_config: Dict[str, Any] = {}
    
    def add_source(self, source: ConfigurationSource):
        """Add a configuration source"""
        self.sources.append(source)
        # Sort by priority
        self.sources.sort(key=lambda s: s.get_priority())
    
    async def load_all(self) -> Dict[str, Any]:
        """Load and merge all configurations"""
        configs = []
        
        # Load from all sources
        for source in self.sources:
            config = await source.load()
            if config:
                configs.append((source.get_priority(), config))
        
        # Sort by priority and merge
        configs.sort(key=lambda x: x[0])
        
        merged = {}
        for _, config in configs:
            merged = self._deep_merge(merged, config)
        
        # Apply inheritance
        merged = self._apply_inheritance(merged)
        
        # Resolve environment variables
        merged = EnvironmentResolver.resolve_config(merged)
        
        # Validate
        self.merged_config = ConfigValidator.validate_full_config(merged)
        
        return self.merged_config
    
    def _deep_merge(self, base: Dict, overlay: Dict) -> Dict:
        """Deep merge two dictionaries"""
        result = copy.deepcopy(base)
        
        for key, value in overlay.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = copy.deepcopy(value)
        
        return result
    
    def _apply_inheritance(self, config: Dict) -> Dict:
        """Apply configuration inheritance"""
        # Look for _extends key
        if "_extends" in config:
            base_name = config.pop("_extends")
            if base_name in config:
                base = config[base_name]
                # Merge current config with base
                for key, value in config.items():
                    if key != base_name and isinstance(value, dict):
                        config[key] = self._deep_merge(base, value)
        
        return config

if WATCHDOG_AVAILABLE:
    class ConfigFileWatcher(FileSystemEventHandler):
        """Watches configuration files for changes"""
        
        def __init__(self, config_manager: 'OptimizedDomainConfig'):
            self.config_manager = config_manager
            self.file_hashes: Dict[str, str] = {}
            self.debounce_timer: Optional[asyncio.Task] = None
            self.pending_reload = False
        
        def on_modified(self, event):
            """Handle file modification events"""
            if event.is_directory:
                return
            
            if event.src_path.endswith(('.yaml', '.yml', '.json')):
                # Check if file actually changed (content-based)
                new_hash = self._calculate_file_hash(event.src_path)
                old_hash = self.file_hashes.get(event.src_path)
                
                if new_hash != old_hash:
                    self.file_hashes[event.src_path] = new_hash
                    self._schedule_reload()
        
        def _calculate_file_hash(self, file_path: str) -> str:
            """Calculate hash of file contents"""
            try:
                with open(file_path, 'rb') as f:
                    return hashlib.md5(f.read()).hexdigest()
            except Exception:
                return ""
        
        def _schedule_reload(self):
            """Schedule configuration reload with debounce"""
            self.pending_reload = True
            
            if self.debounce_timer:
                self.debounce_timer.cancel()
            
            async def delayed_reload():
                await asyncio.sleep(1.0)  # 1 second debounce
                if self.pending_reload:
                    await self.config_manager.reload_configuration()
                    self.pending_reload = False
            
            self.debounce_timer = asyncio.create_task(delayed_reload())

class ConfigChangeNotifier:
    """Notifies subscribers of configuration changes"""
    
    def __init__(self):
        self.subscribers: Set[Callable] = set()
    
    def subscribe(self, callback: Callable[[Dict[str, Any]], None]):
        """Subscribe to configuration changes"""
        self.subscribers.add(callback)
    
    def unsubscribe(self, callback: Callable):
        """Unsubscribe from configuration changes"""
        self.subscribers.discard(callback)
    
    async def notify(self, changes: Dict[str, Any]):
        """Notify all subscribers of changes"""
        tasks = []
        for subscriber in self.subscribers:
            try:
                if asyncio.iscoroutinefunction(subscriber):
                    tasks.append(subscriber(changes))
                else:
                    subscriber(changes)
            except Exception as e:
                logger.error(f"Error notifying subscriber: {e}")
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

class CachedKeywordMatcher:
    """Optimized keyword matching with caching"""
    
    def __init__(self):
        self.keyword_sets: Dict[str, Dict[str, FrozenSet[str]]] = {}
        self.compiled_patterns: Dict[str, re.Pattern] = {}
        self.cache_stats = {
            "hits": 0,
            "misses": 0,
            "evictions": 0
        }
    
    def build_keyword_index(self, domain: str, keywords: Dict[str, List[str]]):
        """Build optimized keyword index for a domain"""
        if domain not in self.keyword_sets:
            self.keyword_sets[domain] = {}
        
        for category, keyword_list in keywords.items():
            # Use frozenset for O(1) lookups
            self.keyword_sets[domain][category] = frozenset(
                kw.lower() for kw in keyword_list
            )
            
            # Pre-compile regex patterns for complex matching
            pattern = '|'.join(re.escape(kw) for kw in keyword_list)
            if pattern:
                self.compiled_patterns[f"{domain}_{category}"] = re.compile(
                    pattern, re.IGNORECASE
                )
    
    @lru_cache(maxsize=1024)
    def match_keywords(
        self, 
        text: str, 
        domain: str, 
        category: Optional[str] = None
    ) -> Tuple[bool, List[str]]:
        """Match keywords in text with caching"""
        text_lower = text.lower()
        matches = []
        
        if domain not in self.keyword_sets:
            self.cache_stats["misses"] += 1
            return False, []
        
        categories = [category] if category else self.keyword_sets[domain].keys()
        
        for cat in categories:
            if cat in self.keyword_sets[domain]:
                # Fast set intersection
                text_words = set(text_lower.split())
                keyword_matches = text_words & self.keyword_sets[domain][cat]
                matches.extend(keyword_matches)
        
        self.cache_stats["hits"] += 1
        return len(matches) > 0, list(matches)
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total = self.cache_stats["hits"] + self.cache_stats["misses"]
        hit_rate = self.cache_stats["hits"] / total if total > 0 else 0
        
        cache_info = {}
        if hasattr(self.match_keywords, 'cache_info'):
            info = self.match_keywords.cache_info()
            cache_info = {
                "hits": info.hits,
                "misses": info.misses,
                "maxsize": info.maxsize,
                "currsize": info.currsize
            }
        
        return {
            **self.cache_stats,
            "hit_rate": hit_rate,
            "cache_info": cache_info
        }
    
    def clear_cache(self):
        """Clear the cache"""
        if hasattr(self.match_keywords, 'cache_clear'):
            self.match_keywords.cache_clear()
        self.cache_stats["evictions"] += self.cache_stats["hits"]
        self.cache_stats["hits"] = 0
        self.cache_stats["misses"] = 0

class OptimizedDomainConfig:
    """Optimized domain configuration management with all features"""
    
    def __init__(
        self, 
        config_dir: str = None,
        enable_hot_reload: bool = True,
        enable_caching: bool = True
    ):
        self.config_dir = Path(config_dir) if config_dir else Path(__file__).parent
        self.enable_hot_reload = enable_hot_reload and WATCHDOG_AVAILABLE
        self.enable_caching = enable_caching
        
        # Core components
        self.config_manager = ConfigurationManager()
        self.validator = ConfigValidator()
        self.keyword_matcher = CachedKeywordMatcher()
        self.notifier = ConfigChangeNotifier()
        
        # Configuration state
        self.configs: Dict[str, Any] = {}
        self.validated_configs: Dict[str, Union[DomainConfigSchema, GlobalConfigSchema]] = {}
        self.last_reload: Optional[datetime] = None
        
        # File watching
        self.observer: Optional[Observer] = None
        self.file_watcher: Optional[ConfigFileWatcher] = None
        
        # Initialize flag
        self._initialized = False
    
    async def initialize(self):
        """Initialize configuration system"""
        if self._initialized:
            return
            
        # Add configuration sources
        self.config_manager.add_source(
            FileConfigSource(self.config_dir / "domain_config.yaml", priority=0)
        )
        self.config_manager.add_source(
            FileConfigSource(self.config_dir / "domain_config.local.yaml", priority=5)
        )
        self.config_manager.add_source(
            EnvironmentConfigSource(prefix="DOMAIN_", priority=10)
        )
        
        # Load initial configuration
        await self.reload_configuration()
        
        # Start file watching if enabled
        if self.enable_hot_reload:
            self._start_file_watching()
            
        self._initialized = True
        logger.info("Optimized domain configuration system initialized")
    
    def _start_file_watching(self):
        """Start watching configuration files"""
        if not WATCHDOG_AVAILABLE:
            logger.warning("File watching disabled: watchdog not available")
            return
            
        try:
            self.file_watcher = ConfigFileWatcher(self)
            self.observer = Observer()
            self.observer.schedule(
                self.file_watcher,
                str(self.config_dir),
                recursive=False
            )
            self.observer.start()
            logger.info("Configuration file watching enabled")
        except Exception as e:
            logger.error(f"Failed to start file watching: {e}")
    
    async def reload_configuration(self):
        """Reload configuration from all sources"""
        try:
            old_configs = self.configs.copy()
            
            # Load and merge configurations
            self.configs = await self.config_manager.load_all()
            
            # Validate configurations
            self._validate_all_configs()
            
            # Rebuild keyword indices
            self._rebuild_keyword_indices()
            
            # Clear caches
            if self.enable_caching:
                self.keyword_matcher.clear_cache()
            
            self.last_reload = datetime.now()
            
            # Notify subscribers of changes
            changes = self._detect_changes(old_configs, self.configs)
            if changes:
                await self.notifier.notify(changes)
            
            logger.info("Configuration reloaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to reload configuration: {e}")
            # Keep old configuration on error
            if not self.configs:
                self.configs = self._get_default_config()
    
    def _validate_all_configs(self):
        """Validate all domain configurations"""
        self.validated_configs = {}
        
        # Validate global config
        if "global" in self.configs:
            try:
                self.validated_configs["global"] = GlobalConfigSchema(
                    **self.configs["global"]
                )
            except Exception as e:
                logger.error(f"Invalid global configuration: {e}")
                self.validated_configs["global"] = GlobalConfigSchema()
        
        # Validate domain configs
        for domain, config in self.configs.items():
            if domain != "global":
                try:
                    self.validated_configs[domain] = DomainConfigSchema(**config)
                except Exception as e:
                    logger.error(f"Invalid configuration for domain {domain}: {e}")
                    self.validated_configs[domain] = DomainConfigSchema()
    
    def _rebuild_keyword_indices(self):
        """Rebuild keyword indices for all domains"""
        for domain, config in self.validated_configs.items():
            if isinstance(config, DomainConfigSchema):
                self.keyword_matcher.build_keyword_index(
                    domain,
                    config.keywords.dict()
                )
    
    def _detect_changes(
        self, 
        old_config: Dict[str, Any], 
        new_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Detect changes between configurations"""
        changes = {
            "added": {},
            "removed": {},
            "modified": {}
        }
        
        # Find added and modified
        for key, value in new_config.items():
            if key not in old_config:
                changes["added"][key] = value
            elif old_config[key] != value:
                changes["modified"][key] = {
                    "old": old_config[key],
                    "new": value
                }
        
        # Find removed
        for key in old_config:
            if key not in new_config:
                changes["removed"][key] = old_config[key]
        
        return changes if any(changes.values()) else {}
    
    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration"""
        return {
            "global": GlobalConfigSchema().dict(),
            "financial": DomainConfigSchema(
                keywords=KeywordConfig(
                    primary=["market", "trading", "investment"],
                    secondary=["risk", "volatility", "equity"],
                    contextual=["earnings", "revenue", "profit"]
                )
            ).dict()
        }
    
    def get_domain_config(self, domain: str) -> Optional[DomainConfigSchema]:
        """Get validated configuration for a domain"""
        if not self._initialized:
            asyncio.create_task(self.initialize())
            
        config = self.validated_configs.get(domain)
        if isinstance(config, DomainConfigSchema):
            return config
        return None
    
    def get_keywords(
        self, 
        domain: str, 
        category: Optional[str] = None
    ) -> List[str]:
        """Get keywords with caching"""
        config = self.get_domain_config(domain)
        if not config:
            return []
        
        if category:
            return getattr(config.keywords, category, [])
        
        # Return all keywords
        all_keywords = []
        for cat in ["primary", "secondary", "contextual"]:
            all_keywords.extend(getattr(config.keywords, cat, []))
        
        return all_keywords
    
    def match_keywords_in_text(
        self,
        text: str,
        domain: str,
        category: Optional[str] = None
    ) -> Tuple[bool, List[str]]:
        """Match keywords in text with caching"""
        if self.enable_caching:
            return self.keyword_matcher.match_keywords(text, domain, category)
        
        # Non-cached version
        keywords = self.get_keywords(domain, category)
        text_lower = text.lower()
        matches = [kw for kw in keywords if kw.lower() in text_lower]
        return len(matches) > 0, matches
    
    def get_threshold(self, domain: str, threshold_name: str) -> float:
        """Get threshold value for a domain"""
        config = self.get_domain_config(domain)
        if config:
            return getattr(config.thresholds, threshold_name, 0.5)
        return 0.5
    
    def get_global_setting(self, setting_name: str) -> Any:
        """Get global configuration setting"""
        global_config = self.validated_configs.get("global")
        if isinstance(global_config, GlobalConfigSchema):
            return getattr(global_config, setting_name, None)
        return None
    
    def subscribe_to_changes(self, callback: Callable[[Dict[str, Any]], None]):
        """Subscribe to configuration changes"""
        self.notifier.subscribe(callback)
    
    def get_configuration_health(self) -> Dict[str, Any]:
        """Get configuration system health status"""
        return {
            "status": "healthy" if self.configs else "unhealthy",
            "last_reload": self.last_reload.isoformat() if self.last_reload else None,
            "domains_loaded": len([d for d in self.validated_configs if d != "global"]),
            "hot_reload_enabled": self.enable_hot_reload,
            "caching_enabled": self.enable_caching,
            "cache_stats": self.keyword_matcher.get_cache_stats() if self.enable_caching else {},
            "file_watching": self.observer.is_alive() if self.observer else False,
            "pydantic_available": PYDANTIC_AVAILABLE,
            "watchdog_available": WATCHDOG_AVAILABLE
        }
    
    def __del__(self):
        """Cleanup resources"""
        if self.observer:
            try:
                self.observer.stop()
                self.observer.join()
            except Exception:
                pass

# Global optimized configuration instance
optimized_domain_config = OptimizedDomainConfig()

# Legacy compatibility function
def load_domain_config() -> Dict[str, Any]:
    """Load domain configuration - legacy compatibility"""
    if not optimized_domain_config._initialized:
        # Synchronously initialize for legacy compatibility
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(optimized_domain_config.initialize())
        finally:
            loop.close()
    
    return optimized_domain_config.configs

def get_domain_keywords(domain: str) -> List[str]:
    """Get keywords for a domain - legacy compatibility"""
    return optimized_domain_config.get_keywords(domain)

def get_domain_threshold(domain: str, threshold_name: str) -> float:
    """Get threshold for a domain - legacy compatibility"""
    return optimized_domain_config.get_threshold(domain, threshold_name)
