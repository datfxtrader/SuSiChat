"""
Template Creation Agent for DeerFlow Research Service

This agent specializes in creating, managing, and optimizing research templates
based on user preferences, query patterns, and research effectiveness.
"""

import json
import asyncio
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
import uuid

@dataclass
class ResearchTemplate:
    """Represents a research template"""
    id: str
    name: str
    description: str
    prompt_template: str
    category: str
    icon: str
    variables: List[str]
    created_by: str
    created_at: str
    usage_count: int = 0
    effectiveness_score: float = 0.0
    tags: List[str] = None
    is_public: bool = False
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = []

@dataclass
class TemplateCategory:
    """Represents a template category"""
    id: str
    name: str
    description: str
    icon: str
    templates: List[str]  # Template IDs

class TemplateAgent:
    """AI Agent specialized in creating and managing research templates"""
    
    def __init__(self):
        self.templates: Dict[str, ResearchTemplate] = {}
        self.categories: Dict[str, TemplateCategory] = {}
        self.user_preferences: Dict[str, Dict] = {}
        self.usage_analytics: Dict[str, List] = {}
        
        # Initialize default categories
        self._initialize_default_categories()
        self._load_default_templates()
    
    def _initialize_default_categories(self):
        """Initialize default template categories"""
        default_categories = [
            {
                "id": "financial",
                "name": "Financial Analysis",
                "description": "Templates for market analysis, investment research, and financial reporting",
                "icon": "TrendingUp",
                "templates": []
            },
            {
                "id": "competitive",
                "name": "Competitive Intelligence",
                "description": "Templates for competitor analysis and market positioning",
                "icon": "Search",
                "templates": []
            },
            {
                "id": "risk",
                "name": "Risk Assessment",
                "description": "Templates for risk analysis and opportunity evaluation",
                "icon": "AlertCircle",
                "templates": []
            },
            {
                "id": "industry",
                "name": "Industry Research",
                "description": "Templates for sector analysis and industry insights",
                "icon": "Database",
                "templates": []
            },
            {
                "id": "technology",
                "name": "Technology Analysis",
                "description": "Templates for tech trends, innovation, and digital transformation",
                "icon": "Sparkles",
                "templates": []
            },
            {
                "id": "custom",
                "name": "Custom Templates",
                "description": "User-created personalized research templates",
                "icon": "Settings",
                "templates": []
            }
        ]
        
        for cat_data in default_categories:
            category = TemplateCategory(**cat_data)
            self.categories[category.id] = category
    
    def _load_default_templates(self):
        """Load default research templates"""
        default_templates = [
            {
                "name": "Market Trend Analysis",
                "description": "Comprehensive analysis of market trends and patterns",
                "prompt_template": "Analyze current market trends for {subject} including price movements, volume patterns, technical indicators, and provide insights on potential future direction based on May 2025 data.",
                "category": "financial",
                "icon": "TrendingUp",
                "variables": ["subject"],
                "tags": ["market", "trends", "analysis", "technical"]
            },
            {
                "name": "Company Financial Deep Dive",
                "description": "Detailed financial analysis and performance evaluation",
                "prompt_template": "Generate a comprehensive financial analysis of {company} covering revenue growth, profitability metrics, balance sheet strength, cash flow analysis, and competitive positioning in {industry} sector for 2025.",
                "category": "financial",
                "icon": "Database",
                "variables": ["company", "industry"],
                "tags": ["financial", "company", "performance", "metrics"]
            },
            {
                "name": "Competitor Landscape Mapping",
                "description": "Comprehensive competitive analysis and market positioning",
                "prompt_template": "Research and analyze the competitive landscape for {company} in the {market} market, including direct competitors, market share analysis, competitive advantages, pricing strategies, and market positioning as of May 2025.",
                "category": "competitive",
                "icon": "Search",
                "variables": ["company", "market"],
                "tags": ["competition", "market-share", "positioning", "strategy"]
            },
            {
                "name": "Investment Risk Assessment",
                "description": "Thorough risk evaluation for investment decisions",
                "prompt_template": "Conduct a comprehensive risk assessment for investing in {investment_target}, analyzing market risks, financial risks, regulatory risks, competitive risks, and provide risk mitigation strategies with current 2025 market conditions.",
                "category": "risk",
                "icon": "AlertCircle",
                "variables": ["investment_target"],
                "tags": ["risk", "investment", "assessment", "mitigation"]
            },
            {
                "name": "Industry Disruption Analysis",
                "description": "Analysis of emerging trends and disruption patterns",
                "prompt_template": "Analyze disruption trends and emerging technologies in the {industry} industry, identifying key innovation drivers, market shifts, new entrants, and potential impact on established players in 2025.",
                "category": "industry",
                "icon": "Sparkles",
                "variables": ["industry"],
                "tags": ["disruption", "innovation", "trends", "technology"]
            },
            {
                "name": "Technology Adoption Analysis",
                "description": "Analysis of technology trends and adoption patterns",
                "prompt_template": "Research the adoption trends and market impact of {technology} including current implementation rates, industry applications, growth projections, key players, and barriers to adoption in 2025.",
                "category": "technology",
                "icon": "Database",
                "variables": ["technology"],
                "tags": ["technology", "adoption", "trends", "implementation"]
            }
        ]
        
        for template_data in default_templates:
            template = self._create_template_from_data(template_data, "system")
            self.templates[template.id] = template
            
            # Add to category
            if template.category in self.categories:
                self.categories[template.category].templates.append(template.id)
    
    def _create_template_from_data(self, template_data: Dict, created_by: str) -> ResearchTemplate:
        """Create a template from data dictionary"""
        template_id = str(uuid.uuid4())
        return ResearchTemplate(
            id=template_id,
            name=template_data["name"],
            description=template_data["description"],
            prompt_template=template_data["prompt_template"],
            category=template_data["category"],
            icon=template_data["icon"],
            variables=template_data["variables"],
            created_by=created_by,
            created_at=datetime.now().isoformat(),
            tags=template_data.get("tags", [])
        )
    
    async def create_custom_template(
        self, 
        user_id: str,
        name: str,
        description: str,
        prompt_template: str,
        category: str = "custom",
        icon: str = "FileText",
        tags: List[str] = None
    ) -> Dict[str, Any]:
        """Create a new custom template"""
        
        # Extract variables from prompt template
        variables = self._extract_variables(prompt_template)
        
        # Validate template
        validation_result = await self._validate_template(prompt_template, variables)
        if not validation_result["valid"]:
            return {
                "success": False,
                "error": validation_result["error"],
                "suggestions": validation_result.get("suggestions", [])
            }
        
        # Create template
        template_data = {
            "name": name,
            "description": description,
            "prompt_template": prompt_template,
            "category": category,
            "icon": icon,
            "variables": variables,
            "tags": tags or []
        }
        
        template = self._create_template_from_data(template_data, user_id)
        self.templates[template.id] = template
        
        # Add to category
        if category in self.categories:
            self.categories[category].templates.append(template.id)
        
        return {
            "success": True,
            "template": asdict(template),
            "message": f"Template '{name}' created successfully!"
        }
    
    def _extract_variables(self, prompt_template: str) -> List[str]:
        """Extract variable placeholders from template"""
        import re
        variables = re.findall(r'\{([^}]+)\}', prompt_template)
        return list(set(variables))  # Remove duplicates
    
    async def _validate_template(self, prompt_template: str, variables: List[str]) -> Dict[str, Any]:
        """Validate template structure and effectiveness"""
        
        issues = []
        suggestions = []
        
        # Basic validation
        if len(prompt_template) < 20:
            issues.append("Template is too short for effective research")
        
        if not variables:
            suggestions.append("Consider adding variables with {variable_name} syntax for flexibility")
        
        # Check for research-oriented language
        research_keywords = [
            "analyze", "research", "investigate", "evaluate", "assess",
            "examine", "study", "review", "compare", "forecast"
        ]
        
        if not any(keyword in prompt_template.lower() for keyword in research_keywords):
            suggestions.append("Consider adding research-oriented action words like 'analyze', 'investigate', or 'evaluate'")
        
        # Check for specificity indicators
        specificity_keywords = [
            "comprehensive", "detailed", "thorough", "in-depth",
            "current", "latest", "2025", "trends", "data"
        ]
        
        if not any(keyword in prompt_template.lower() for keyword in specificity_keywords):
            suggestions.append("Consider adding specificity words like 'comprehensive', 'current', or 'detailed'")
        
        return {
            "valid": len(issues) == 0,
            "error": issues[0] if issues else None,
            "suggestions": suggestions
        }
    
    async def suggest_template_improvements(self, template_id: str) -> Dict[str, Any]:
        """AI-powered suggestions for template improvement"""
        
        if template_id not in self.templates:
            return {"error": "Template not found"}
        
        template = self.templates[template_id]
        
        # Analyze usage patterns
        usage_data = self.usage_analytics.get(template_id, [])
        
        suggestions = []
        
        # Low usage analysis
        if template.usage_count < 5:
            suggestions.append({
                "type": "engagement",
                "suggestion": "Consider making the template more specific or adding trending keywords",
                "reason": "Low usage might indicate the template is too generic"
            })
        
        # Effectiveness analysis
        if template.effectiveness_score < 0.7:
            suggestions.append({
                "type": "effectiveness",
                "suggestion": "Try adding more context or specific research directions",
                "reason": "Template could generate more actionable results"
            })
        
        # Variable optimization
        if len(template.variables) == 1:
            suggestions.append({
                "type": "flexibility",
                "suggestion": "Consider adding more variables for greater customization",
                "reason": "More variables allow for more targeted research"
            })
        
        return {
            "template_id": template_id,
            "current_performance": {
                "usage_count": template.usage_count,
                "effectiveness_score": template.effectiveness_score
            },
            "suggestions": suggestions
        }
    
    async def generate_template_from_query(self, user_id: str, query: str) -> Dict[str, Any]:
        """AI-powered template generation from successful queries"""
        
        # Analyze the query to extract patterns
        template_analysis = await self._analyze_query_for_template(query)
        
        if not template_analysis["suitable"]:
            return {
                "success": False,
                "message": "Query doesn't appear suitable for template creation",
                "reason": template_analysis["reason"]
            }
        
        # Generate template
        suggested_template = {
            "name": template_analysis["suggested_name"],
            "description": template_analysis["description"],
            "prompt_template": template_analysis["template"],
            "category": template_analysis["category"],
            "icon": template_analysis["icon"],
            "variables": template_analysis["variables"],
            "tags": template_analysis["tags"]
        }
        
        return {
            "success": True,
            "suggested_template": suggested_template,
            "confidence": template_analysis["confidence"],
            "message": "Template generated successfully from your query!"
        }
    
    async def _analyze_query_for_template(self, query: str) -> Dict[str, Any]:
        """Analyze query to determine if it's suitable for template creation"""
        
        # Simple pattern recognition (in production, this would use more sophisticated NLP)
        query_lower = query.lower()
        
        # Check if query has template potential
        has_specific_entities = any(word in query_lower for word in [
            "tesla", "apple", "bitcoin", "nvidia", "microsoft", "amazon"
        ])
        
        has_action_words = any(word in query_lower for word in [
            "analyze", "research", "investigate", "evaluate", "assess", "compare"
        ])
        
        if not has_action_words:
            return {
                "suitable": False,
                "reason": "Query lacks research action words"
            }
        
        # Extract potential variables
        variables = []
        template = query
        
        if has_specific_entities:
            # Replace specific entities with variables
            entities = {
                "tesla": "company",
                "apple": "company", 
                "bitcoin": "cryptocurrency",
                "nvidia": "company",
                "microsoft": "company",
                "amazon": "company"
            }
            
            for entity, var_type in entities.items():
                if entity in query_lower:
                    template = template.replace(entity, f"{{{var_type}}}")
                    template = template.replace(entity.title(), f"{{{var_type}}}")
                    if var_type not in variables:
                        variables.append(var_type)
        
        # Determine category
        category = "custom"
        if any(word in query_lower for word in ["market", "price", "financial", "investment"]):
            category = "financial"
        elif any(word in query_lower for word in ["competitor", "competition", "market share"]):
            category = "competitive"
        elif any(word in query_lower for word in ["risk", "assessment", "evaluation"]):
            category = "risk"
        elif any(word in query_lower for word in ["industry", "sector", "trends"]):
            category = "industry"
        elif any(word in query_lower for word in ["technology", "innovation", "tech"]):
            category = "technology"
        
        return {
            "suitable": True,
            "suggested_name": f"Custom {category.title()} Analysis",
            "description": f"Generated from successful research query",
            "template": template,
            "category": category,
            "icon": "FileText",
            "variables": variables,
            "tags": ["custom", "ai-generated"],
            "confidence": 0.8
        }
    
    def get_templates_by_category(self, category: str) -> List[Dict]:
        """Get all templates in a specific category"""
        if category not in self.categories:
            return []
        
        template_ids = self.categories[category].templates
        return [asdict(self.templates[tid]) for tid in template_ids if tid in self.templates]
    
    def get_user_templates(self, user_id: str) -> List[Dict]:
        """Get all templates created by a specific user"""
        user_templates = [
            asdict(template) for template in self.templates.values()
            if template.created_by == user_id
        ]
        return sorted(user_templates, key=lambda x: x["created_at"], reverse=True)
    
    def get_popular_templates(self, limit: int = 10) -> List[Dict]:
        """Get most popular templates by usage"""
        popular = sorted(
            self.templates.values(),
            key=lambda x: x.usage_count,
            reverse=True
        )[:limit]
        return [asdict(template) for template in popular]
    
    def track_template_usage(self, template_id: str, effectiveness_score: float = None):
        """Track template usage and effectiveness"""
        if template_id in self.templates:
            self.templates[template_id].usage_count += 1
            
            if effectiveness_score is not None:
                # Update effectiveness score (running average)
                current = self.templates[template_id].effectiveness_score
                count = self.templates[template_id].usage_count
                new_score = ((current * (count - 1)) + effectiveness_score) / count
                self.templates[template_id].effectiveness_score = new_score
    
    def search_templates(self, query: str, category: str = None) -> List[Dict]:
        """Search templates by name, description, or tags"""
        query_lower = query.lower()
        results = []
        
        for template in self.templates.values():
            if category and template.category != category:
                continue
                
            # Search in name, description, and tags
            searchable_text = (
                template.name.lower() + " " +
                template.description.lower() + " " +
                " ".join(template.tags).lower()
            )
            
            if query_lower in searchable_text:
                results.append(asdict(template))
        
        return results
    
    def export_templates(self, user_id: str = None) -> Dict[str, Any]:
        """Export templates for backup or sharing"""
        if user_id:
            templates_to_export = self.get_user_templates(user_id)
        else:
            templates_to_export = [asdict(t) for t in self.templates.values()]
        
        return {
            "export_date": datetime.now().isoformat(),
            "template_count": len(templates_to_export),
            "templates": templates_to_export,
            "categories": [asdict(cat) for cat in self.categories.values()]
        }

# Global template agent instance
template_agent = TemplateAgent()