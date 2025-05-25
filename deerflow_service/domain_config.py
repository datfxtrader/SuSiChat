
"""
Domain Configuration Management

This module handles loading and managing configuration for domain agents,
including keywords, thresholds, and analysis parameters.
"""

import yaml
import os
from typing import Dict, Any, Optional, List
import logging

logger = logging.getLogger("domain_config")

class DomainConfig:
    """Manages domain agent configuration"""
    
    def __init__(self, config_path: str = None):
        if config_path is None:
            config_path = os.path.join(os.path.dirname(__file__), "domain_config.yaml")
        
        self.config_path = config_path
        self.configs = {}
        self._load_configuration()
    
    def _load_configuration(self):
        """Load configuration from YAML file"""
        try:
            if os.path.exists(self.config_path):
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    self.configs = yaml.safe_load(f) or {}
                logger.info(f"Domain configuration loaded from {self.config_path}")
            else:
                logger.warning(f"Configuration file not found: {self.config_path}")
                self.configs = self._get_default_config()
        except Exception as e:
            logger.error(f"Failed to load configuration: {e}")
            self.configs = self._get_default_config()
    
    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration if file loading fails"""
        return {
            "financial": {
                "keywords": {
                    "primary": ["market", "trading", "investment", "portfolio"],
                    "secondary": ["risk", "volatility", "equity", "bond"],
                    "contextual": ["earnings", "revenue", "profit", "dividend"]
                },
                "thresholds": {
                    "relevance_score": 0.3,
                    "confidence_threshold": 0.6
                }
            },
            "global": {
                "cache_size": 128,
                "max_concurrent_analyses": 5,
                "error_threshold": 10
            }
        }
    
    def get_domain_config(self, domain: str) -> Dict[str, Any]:
        """Get configuration for a specific domain"""
        return self.configs.get(domain, {})
    
    def get_keywords(self, domain: str, category: str = None) -> List[str]:
        """Get keywords for a domain, optionally filtered by category"""
        domain_config = self.get_domain_config(domain)
        keywords = domain_config.get("keywords", {})
        
        if category:
            return keywords.get(category, [])
        
        # Return all keywords if no category specified
        all_keywords = []
        for keyword_list in keywords.values():
            if isinstance(keyword_list, list):
                all_keywords.extend(keyword_list)
        
        return all_keywords
    
    def get_keyword_categories(self, domain: str) -> Dict[str, List[str]]:
        """Get all keyword categories for a domain"""
        domain_config = self.get_domain_config(domain)
        return domain_config.get("keywords", {})
    
    def get_threshold(self, domain: str, threshold_name: str) -> float:
        """Get a specific threshold value for a domain"""
        domain_config = self.get_domain_config(domain)
        thresholds = domain_config.get("thresholds", {})
        return thresholds.get(threshold_name, 0.5)  # Default threshold
    
    def get_global_setting(self, setting_name: str, default_value: Any = None) -> Any:
        """Get a global configuration setting"""
        global_config = self.configs.get("global", {})
        return global_config.get(setting_name, default_value)
    
    def reload_configuration(self):
        """Reload configuration from file"""
        self._load_configuration()
        logger.info("Domain configuration reloaded")
    
    def update_domain_config(self, domain: str, config_updates: Dict[str, Any]):
        """Update configuration for a specific domain"""
        if domain not in self.configs:
            self.configs[domain] = {}
        
        self.configs[domain].update(config_updates)
        logger.info(f"Configuration updated for domain: {domain}")
    
    def save_configuration(self):
        """Save current configuration to file"""
        try:
            with open(self.config_path, 'w', encoding='utf-8') as f:
                yaml.dump(self.configs, f, default_flow_style=False, indent=2)
            logger.info(f"Configuration saved to {self.config_path}")
        except Exception as e:
            logger.error(f"Failed to save configuration: {e}")
    
    def validate_configuration(self) -> Dict[str, List[str]]:
        """Validate the current configuration and return any issues"""
        issues = {"errors": [], "warnings": []}
        
        required_sections = ["financial", "technical", "market", "risk"]
        for section in required_sections:
            if section not in self.configs:
                issues["warnings"].append(f"Missing configuration section: {section}")
            else:
                section_config = self.configs[section]
                
                # Check for required subsections
                if "keywords" not in section_config:
                    issues["errors"].append(f"Missing keywords in {section} configuration")
                
                if "thresholds" not in section_config:
                    issues["warnings"].append(f"Missing thresholds in {section} configuration")
        
        # Check global configuration
        if "global" not in self.configs:
            issues["warnings"].append("Missing global configuration section")
        
        return issues
    
    def get_configuration_summary(self) -> Dict[str, Any]:
        """Get a summary of the current configuration"""
        summary = {
            "domains_configured": len([k for k in self.configs.keys() if k != "global"]),
            "total_keywords": 0,
            "domains": {}
        }
        
        for domain, config in self.configs.items():
            if domain == "global":
                continue
            
            keywords = config.get("keywords", {})
            total_domain_keywords = sum(
                len(kw_list) if isinstance(kw_list, list) else 0 
                for kw_list in keywords.values()
            )
            
            summary["total_keywords"] += total_domain_keywords
            summary["domains"][domain] = {
                "keyword_count": total_domain_keywords,
                "keyword_categories": list(keywords.keys()),
                "has_thresholds": "thresholds" in config
            }
        
        return summary

# Global configuration instance
domain_config = DomainConfig()
