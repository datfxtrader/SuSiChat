
import asyncio
import aioredis
import pickle
import re
import uuid
import time
import logging
import numpy as np
from typing import Dict, List, Any, Optional, Set
from dataclasses import dataclass, asdict, field
from datetime import datetime
from functools import lru_cache
from collections import defaultdict
from cachetools import TTLCache, LRUCache
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger("template_agent")

@dataclass
class OptimizedResearchTemplate:
    """Enhanced template with versioning and metadata"""
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
    tags: List[str] = field(default_factory=list)
    is_public: bool = False
    version: int = 1
    parent_id: Optional[str] = None  # For version tracking
    embeddings: Optional[np.ndarray] = None  # For similarity search

class OptimizedTemplateAgent:
    """Optimized template agent with persistence and advanced search"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        # Redis for persistence
        self.redis_url = redis_url
        self.redis_client = None
        
        # In-memory cache with TTL
        self.template_cache = TTLCache(maxsize=1000, ttl=300)
        self.search_cache = LRUCache(maxsize=500)
        
        # Templates storage
        self.templates: Dict[str, OptimizedResearchTemplate] = {}
        
        # TF-IDF for advanced search
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 3)
        )
        self.template_embeddings = {}
        
        # Compiled regex patterns for variable extraction
        self.variable_pattern = re.compile(r'\{([^}]+)\}')
        
        # Analytics tracking
        self.usage_analytics = defaultdict(list)
        
        # Async lock for thread safety
        self.lock = asyncio.Lock()
        
        # Background tasks
        self.background_tasks = set()
        
        # Default templates
        self.default_templates = [
            {
                "name": "Financial Analysis",
                "description": "Comprehensive financial analysis and research",
                "prompt_template": "Analyze the financial performance of {company} focusing on {metrics}. Provide insights on {analysis_period} performance.",
                "category": "financial",
                "icon": "TrendingUp",
                "tags": ["finance", "analysis", "stocks"]
            },
            {
                "name": "Market Research",
                "description": "In-depth market research and competitive analysis",
                "prompt_template": "Research the {industry} market, focusing on {focus_areas}. Analyze competitors and market trends for {time_frame}.",
                "category": "business",
                "icon": "BarChart",
                "tags": ["market", "research", "competition"]
            },
            {
                "name": "Technical Analysis",
                "description": "Technical documentation and code analysis",
                "prompt_template": "Analyze {technology} implementation for {use_case}. Focus on {technical_aspects} and provide recommendations.",
                "category": "technical",
                "icon": "Code",
                "tags": ["technical", "code", "analysis"]
            }
        ]
        
        logger.info("OptimizedTemplateAgent initialized")
    
    async def initialize(self):
        """Async initialization with Redis connection"""
        try:
            self.redis_client = await aioredis.create_redis_pool(self.redis_url)
            logger.info("Connected to Redis for template persistence")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Using memory-only storage.")
            self.redis_client = None
        
        # Load templates from Redis or initialize defaults
        await self._load_templates_from_redis()
        
        # Initialize search index
        await self._build_search_index()
        
        # Start background tasks
        self._start_background_tasks()
        
        logger.info("OptimizedTemplateAgent initialized with persistence")
    
    async def _load_templates_from_redis(self):
        """Load all templates from Redis"""
        if not self.redis_client:
            await self._load_default_templates_async()
            return
        
        try:
            template_keys = await self.redis_client.keys('template:*')
            
            if template_keys:
                # Batch load templates
                templates_data = await self.redis_client.mget(*template_keys)
                
                for data in templates_data:
                    if data:
                        template = pickle.loads(data)
                        self.templates[template.id] = template
                        self.template_cache[template.id] = template
                        
                logger.info(f"Loaded {len(self.templates)} templates from Redis")
            else:
                # First run - load defaults
                await self._load_default_templates_async()
        except Exception as e:
            logger.error(f"Error loading templates from Redis: {e}")
            await self._load_default_templates_async()
    
    async def _load_default_templates_async(self):
        """Load default templates"""
        for template_data in self.default_templates:
            await self.create_custom_template(
                user_id="system",
                name=template_data["name"],
                description=template_data["description"],
                prompt_template=template_data["prompt_template"],
                category=template_data["category"],
                icon=template_data["icon"],
                tags=template_data["tags"]
            )
        
        logger.info(f"Loaded {len(self.default_templates)} default templates")
    
    async def _save_template_to_redis(self, template: OptimizedResearchTemplate):
        """Save template to Redis with atomic operation"""
        if not self.redis_client:
            return
        
        key = f"template:{template.id}"
        
        async with self.lock:
            try:
                # Save to Redis
                await self.redis_client.set(key, pickle.dumps(template))
                
                # Update cache
                self.template_cache[template.id] = template
                
                # Update search index
                await self._update_search_index(template)
                
            except Exception as e:
                logger.error(f"Error saving template to Redis: {e}")
    
    async def create_custom_template(
        self,
        user_id: str,
        name: str,
        description: str,
        prompt_template: str,
        category: str = "custom",
        icon: str = "FileText",
        tags: List[str] = None,
        parent_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create template with validation and persistence"""
        
        # Extract variables efficiently
        variables = self._extract_variables_optimized(prompt_template)
        
        # Async validation
        validation_result = await self._validate_template_async(
            prompt_template, variables
        )
        
        if not validation_result["valid"]:
            return {
                "success": False,
                "error": validation_result["error"],
                "suggestions": validation_result.get("suggestions", [])
            }
        
        # Create optimized template
        template = OptimizedResearchTemplate(
            id=str(uuid.uuid4()),
            name=name,
            description=description,
            prompt_template=prompt_template,
            category=category,
            icon=icon,
            variables=variables,
            created_by=user_id,
            created_at=datetime.now().isoformat(),
            tags=tags or [],
            parent_id=parent_id,
            version=1 if not parent_id else await self._get_next_version(parent_id)
        )
        
        # Generate embeddings for search
        template.embeddings = await self._generate_embeddings(template)
        
        # Add to memory
        self.templates[template.id] = template
        
        # Save to Redis and update indices
        await self._save_template_to_redis(template)
        
        # Track creation event
        await self._track_event('template_created', {
            'template_id': template.id,
            'user_id': user_id,
            'category': category
        })
        
        return {
            "success": True,
            "template": asdict(template),
            "message": f"Template '{name}' created successfully!"
        }
    
    @lru_cache(maxsize=1000)
    def _extract_variables_optimized(self, prompt_template: str) -> List[str]:
        """Cached variable extraction"""
        return list(set(self.variable_pattern.findall(prompt_template)))
    
    async def _validate_template_async(
        self,
        prompt_template: str,
        variables: List[str]
    ) -> Dict[str, Any]:
        """Async template validation with analysis"""
        
        validation_tasks = [
            self._validate_structure(prompt_template, variables),
            self._validate_research_quality(prompt_template),
            self._validate_variable_usage(prompt_template, variables),
            self._check_similarity_to_existing(prompt_template)
        ]
        
        results = await asyncio.gather(*validation_tasks)
        
        issues = []
        suggestions = []
        
        for result in results:
            if result.get("issues"):
                issues.extend(result["issues"])
            if result.get("suggestions"):
                suggestions.extend(result["suggestions"])
        
        return {
            "valid": len(issues) == 0,
            "error": issues[0] if issues else None,
            "suggestions": suggestions,
            "quality_score": sum(r.get("score", 0) for r in results) / len(results)
        }
    
    async def _validate_structure(self, prompt_template: str, variables: List[str]) -> Dict[str, Any]:
        """Validate template structure"""
        issues = []
        suggestions = []
        score = 0.8
        
        # Check minimum length
        if len(prompt_template) < 20:
            issues.append("Template is too short")
            score -= 0.3
        
        # Check for variables
        if not variables:
            suggestions.append("Consider adding variables with {variable_name} syntax")
            score -= 0.2
        
        # Check for research-oriented language
        research_keywords = ["analyze", "research", "investigate", "examine", "explore"]
        if not any(keyword in prompt_template.lower() for keyword in research_keywords):
            suggestions.append("Consider adding research-oriented keywords")
            score -= 0.1
        
        return {"issues": issues, "suggestions": suggestions, "score": max(0, score)}
    
    async def _validate_research_quality(self, prompt_template: str) -> Dict[str, Any]:
        """Validate research quality aspects"""
        suggestions = []
        score = 0.8
        
        # Check for specificity
        if len(prompt_template.split()) < 10:
            suggestions.append("Consider making the template more specific")
            score -= 0.2
        
        # Check for actionable instructions
        action_words = ["provide", "analyze", "compare", "evaluate", "assess"]
        if not any(word in prompt_template.lower() for word in action_words):
            suggestions.append("Add clear action words like 'analyze', 'compare', 'evaluate'")
            score -= 0.1
        
        return {"suggestions": suggestions, "score": max(0, score)}
    
    async def _validate_variable_usage(self, prompt_template: str, variables: List[str]) -> Dict[str, Any]:
        """Validate variable usage"""
        suggestions = []
        score = 0.9
        
        # Check for unused variables
        for var in variables:
            if prompt_template.count(f"{{{var}}}") > 1:
                suggestions.append(f"Variable '{var}' is used multiple times")
        
        return {"suggestions": suggestions, "score": score}
    
    async def _check_similarity_to_existing(self, prompt_template: str) -> Dict[str, Any]:
        """Check similarity to existing templates"""
        suggestions = []
        score = 0.9
        
        # Simple similarity check
        for template in self.templates.values():
            if len(template.prompt_template) > 0:
                similarity = self._calculate_text_similarity(
                    prompt_template, template.prompt_template
                )
                if similarity > 0.8:
                    suggestions.append(f"Very similar to existing template: '{template.name}'")
                    score -= 0.3
                    break
        
        return {"suggestions": suggestions, "score": max(0, score)}
    
    def _calculate_text_similarity(self, text1: str, text2: str) -> float:
        """Calculate text similarity using simple word overlap"""
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union)
    
    async def _get_next_version(self, parent_id: str) -> int:
        """Get next version number for template"""
        max_version = 0
        for template in self.templates.values():
            if template.parent_id == parent_id:
                max_version = max(max_version, template.version)
        return max_version + 1
    
    async def search_templates_advanced(
        self,
        query: str,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        user_id: Optional[str] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Advanced search with semantic similarity"""
        
        # Check cache
        cache_key = f"{query}:{category}:{tags}:{user_id}"
        if cache_key in self.search_cache:
            return self.search_cache[cache_key]
        
        # Generate query embedding
        query_embedding = await self._generate_text_embedding(query)
        
        # Calculate similarities
        similarities = []
        
        for template_id, template in self.templates.items():
            # Apply filters
            if category and template.category != category:
                continue
            if tags and not set(tags).intersection(set(template.tags)):
                continue
            if user_id and template.created_by != user_id and not template.is_public:
                continue
            
            # Calculate similarity
            if template.embeddings is not None:
                similarity = cosine_similarity(
                    query_embedding.reshape(1, -1),
                    template.embeddings.reshape(1, -1)
                )[0][0]
                
                similarities.append((template_id, similarity))
        
        # Sort by similarity
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        # Get top results
        results = []
        for template_id, similarity in similarities[:limit]:
            template = self.templates[template_id]
            result = asdict(template)
            result['similarity_score'] = similarity
            results.append(result)
        
        # Cache results
        self.search_cache[cache_key] = results
        
        return results
    
    async def _generate_embeddings(
        self,
        template: OptimizedResearchTemplate
    ) -> np.ndarray:
        """Generate embeddings for template"""
        
        # Combine text fields
        text = f"{template.name} {template.description} {' '.join(template.tags)}"
        
        return await self._generate_text_embedding(text)
    
    async def _generate_text_embedding(self, text: str) -> np.ndarray:
        """Generate text embedding using TF-IDF"""
        
        try:
            embedding = self.tfidf_vectorizer.transform([text]).toarray()[0]
        except:
            # Fit vectorizer if not fitted
            all_texts = [
                f"{t.name} {t.description} {' '.join(t.tags)}"
                for t in self.templates.values()
            ]
            if all_texts:
                self.tfidf_vectorizer.fit(all_texts)
                embedding = self.tfidf_vectorizer.transform([text]).toarray()[0]
            else:
                # Return zero embedding if no templates
                embedding = np.zeros(1000)
        
        return embedding
    
    async def _build_search_index(self):
        """Build search index for existing templates"""
        if not self.templates:
            return
        
        try:
            all_texts = [
                f"{t.name} {t.description} {' '.join(t.tags)}"
                for t in self.templates.values()
            ]
            
            self.tfidf_vectorizer.fit(all_texts)
            
            # Generate embeddings for all templates
            for template in self.templates.values():
                template.embeddings = await self._generate_embeddings(template)
                
            logger.info("Search index built successfully")
        except Exception as e:
            logger.error(f"Error building search index: {e}")
    
    async def _update_search_index(self, template: OptimizedResearchTemplate):
        """Update search index with new template"""
        try:
            # Regenerate embeddings for the new template
            template.embeddings = await self._generate_embeddings(template)
        except Exception as e:
            logger.error(f"Error updating search index: {e}")
    
    async def _track_event(self, event_type: str, data: Dict[str, Any]):
        """Track analytics events"""
        self.usage_analytics[event_type].append({
            **data,
            'timestamp': time.time()
        })
    
    def _start_background_tasks(self):
        """Start background maintenance tasks"""
        
        # Periodic cache cleanup
        task = asyncio.create_task(self._periodic_cache_cleanup())
        self.background_tasks.add(task)
        
        # Periodic Redis sync
        if self.redis_client:
            task = asyncio.create_task(self._periodic_redis_sync())
            self.background_tasks.add(task)
        
        # Analytics aggregation
        task = asyncio.create_task(self._periodic_analytics_aggregation())
        self.background_tasks.add(task)
    
    async def _periodic_cache_cleanup(self):
        """Clean up expired cache entries"""
        while True:
            try:
                await asyncio.sleep(300)  # Every 5 minutes
                
                # Clear search cache
                self.search_cache.clear()
                
                logger.debug("Cache cleanup completed")
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Cache cleanup error: {e}")
    
    async def _periodic_redis_sync(self):
        """Periodic sync with Redis"""
        while True:
            try:
                await asyncio.sleep(600)  # Every 10 minutes
                
                # Sync usage counts and effectiveness scores
                for template in self.templates.values():
                    await self._save_template_to_redis(template)
                
                logger.debug("Redis sync completed")
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Redis sync error: {e}")
    
    async def _periodic_analytics_aggregation(self):
        """Aggregate analytics data"""
        while True:
            try:
                await asyncio.sleep(3600)  # Every hour
                
                # Aggregate usage analytics
                total_created = len(self.usage_analytics.get('template_created', []))
                logger.info(f"Analytics: {total_created} templates created")
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Analytics aggregation error: {e}")
    
    def get_template(self, template_id: str) -> Optional[OptimizedResearchTemplate]:
        """Get template by ID"""
        return self.templates.get(template_id)
    
    def get_all_templates(self) -> List[Dict[str, Any]]:
        """Get all templates"""
        return [asdict(template) for template in self.templates.values()]
    
    def track_template_usage(self, template_id: str, effectiveness: float):
        """Track template usage and effectiveness"""
        if template_id in self.templates:
            template = self.templates[template_id]
            template.usage_count += 1
            
            # Update effectiveness score (exponential moving average)
            alpha = 0.1
            template.effectiveness_score = (
                alpha * effectiveness + 
                (1 - alpha) * template.effectiveness_score
            )
    
    async def shutdown(self):
        """Graceful shutdown"""
        # Cancel background tasks
        for task in self.background_tasks:
            task.cancel()
        
        await asyncio.gather(*self.background_tasks, return_exceptions=True)
        
        # Close Redis connection
        if self.redis_client:
            self.redis_client.close()
            await self.redis_client.wait_closed()
        
        logger.info("TemplateAgent shutdown complete")

# Global optimized instance
template_agent = OptimizedTemplateAgent()
