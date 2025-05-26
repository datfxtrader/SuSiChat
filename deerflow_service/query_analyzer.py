
import re
import logging
import time
import numpy as np
from typing import List, Dict, Any, Set, Pattern
from collections import defaultdict
from functools import lru_cache
from cachetools import TTLCache

logger = logging.getLogger("query_analyzer")

class OptimizedQueryAnalyzer:
    """Optimized query analyzer with compiled patterns, caching, and NLP features"""
    
    def __init__(self):
        # Pre-compile all regex patterns for performance
        self.compiled_patterns = self._compile_patterns()
        
        # TTL cache for analysis results (5 minute cache)
        self.analysis_cache = TTLCache(maxsize=1000, ttl=300)
        
        # Pre-compute domain keyword sets for faster matching
        self.domain_keyword_sets = {
            domain: set(keywords)
            for domain, keywords in self.domain_keywords.items()
        }
        
        # Performance metrics
        self.stats = {
            "cache_hits": 0,
            "cache_misses": 0,
            "total_queries": 0,
            "avg_analysis_time": 0.0
        }
        
        # Intent patterns for classification
        self.intent_patterns = {
            "comparison": {
                "keywords": ["compare", "versus", "vs", "difference", "better", "worse", "contrast"],
                "patterns": [r"\w+ vs \w+", r"compare \w+ to \w+", r"difference between \w+ and \w+"]
            },
            "analysis": {
                "keywords": ["analyze", "evaluate", "assess", "examine", "investigate", "study"],
                "patterns": [r"analyze \w+", r"evaluate the \w+", r"assess \w+"]
            },
            "explanation": {
                "keywords": ["explain", "what is", "how does", "why", "describe", "define"],
                "patterns": [r"what is \w+", r"explain \w+", r"how does \w+ work"]
            },
            "prediction": {
                "keywords": ["predict", "forecast", "future", "will", "trend", "outlook"],
                "patterns": [r"predict \w+", r"future of \w+", r"\w+ trends"]
            },
            "research": {
                "keywords": ["research", "investigate", "find", "search", "explore", "discover"],
                "patterns": [r"research \w+", r"find information about \w+", r"explore \w+"]
            }
        }
        
        # Domain classifiers with expanded keywords
        self.domain_keywords = {
            "financial": [
                "stock", "market", "trading", "investment", "currency", "bitcoin", 
                "forex", "portfolio", "economic", "earnings", "revenue", "profit",
                "valuation", "dividend", "bonds", "commodity", "inflation", "gdp"
            ],
            "scientific": [
                "research", "study", "experiment", "hypothesis", "theory", "data", 
                "analysis", "methodology", "peer-reviewed", "scientific", "publication",
                "journal", "citation", "academic", "laboratory", "clinical"
            ],
            "technical": [
                "code", "programming", "software", "algorithm", "system", "technology", 
                "development", "api", "framework", "architecture", "database", "server",
                "cloud", "network", "security", "automation", "machine learning"
            ],
            "medical": [
                "health", "disease", "treatment", "symptom", "diagnosis", "medicine", 
                "patient", "clinical", "therapy", "medical", "healthcare", "pharmaceutical",
                "vaccine", "surgery", "hospital", "doctor", "nurse"
            ],
            "legal": [
                "law", "legal", "court", "regulation", "compliance", "contract", 
                "case", "statute", "litigation", "attorney", "judge", "lawsuit",
                "constitutional", "criminal", "civil", "patent", "trademark"
            ]
        }
    
    def _compile_patterns(self) -> Dict[str, Dict[str, List[Pattern]]]:
        """Pre-compile all regex patterns for better performance"""
        compiled = {}
        
        for intent, data in self.intent_patterns.items():
            compiled[intent] = {
                'keywords': data['keywords'],
                'patterns': [re.compile(pattern, re.IGNORECASE) 
                           for pattern in data['patterns']]
            }
        
        return compiled
    
    @lru_cache(maxsize=500)
    def analyze_query(self, query: str) -> Dict[str, Any]:
        """Comprehensive query analysis with caching and optimization"""
        start_time = time.time()
        self.stats["total_queries"] += 1
        
        # Check cache first
        cache_key = hash(query.strip().lower())
        if cache_key in self.analysis_cache:
            self.stats["cache_hits"] += 1
            cached_result = self.analysis_cache[cache_key]
            cached_result["from_cache"] = True
            return cached_result
        
        self.stats["cache_misses"] += 1
        
        # Tokenize and prepare
        words = self._tokenize_optimized(query)
        entities = self._extract_entities_optimized(query, words)
        
        # Parallel analysis components
        intent = self._classify_intent_optimized(query, words)
        domains = self._classify_domains_optimized(query, words)
        complexity = self._analyze_complexity_optimized(query, words)
        concepts = self._extract_concepts_optimized(words)
        capabilities = self._determine_capabilities(intent, domains, complexity)
        
        # Calculate semantic features
        semantic_features = self._calculate_semantic_features(query, words)
        
        result = {
            "query": query,
            "intent": intent,
            "domains": domains,
            "entities": entities,
            "concepts": concepts,
            "complexity": complexity,
            "capabilities": capabilities,
            "semantic_features": semantic_features,
            "metadata": {
                "word_count": len(words),
                "unique_words": len(set(words)),
                "has_questions": "?" in query,
                "sentence_count": len([s for s in query.split('.') if s.strip()]),
                "avg_word_length": np.mean([len(word) for word in words]) if words else 0,
                "analysis_time_ms": (time.time() - start_time) * 1000
            },
            "from_cache": False
        }
        
        # Cache result
        self.analysis_cache[cache_key] = result
        
        # Update performance stats
        analysis_time = time.time() - start_time
        self.stats["avg_analysis_time"] = (
            (self.stats["avg_analysis_time"] * (self.stats["total_queries"] - 1) + analysis_time) 
            / self.stats["total_queries"]
        )
        
        return result
    
    def _tokenize_optimized(self, query: str) -> List[str]:
        """Optimized tokenization with preprocessing"""
        # Remove extra whitespace and normalize
        normalized = re.sub(r'\s+', ' ', query.strip())
        
        # Split on word boundaries, keeping alphanumeric
        tokens = re.findall(r'\b\w+\b', normalized.lower())
        
        # Filter out very short tokens
        return [token for token in tokens if len(token) > 2]
    
    def _extract_entities_optimized(self, query: str, words: List[str]) -> List[Dict[str, str]]:
        """Optimized entity extraction using compiled patterns"""
        entities = []
        
        # Compiled patterns for common entities
        patterns = {
            "MONEY": re.compile(r'\$[\d,]+(?:\.\d{2})?|\b\d+(?:\.\d+)?\s*(?:dollars?|USD|cents?)\b', re.IGNORECASE),
            "PERCENTAGE": re.compile(r'\b\d+(?:\.\d+)?%|\b\d+(?:\.\d+)?\s*percent\b', re.IGNORECASE),
            "DATE": re.compile(r'\b\d{4}\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s*\d{4}\b', re.IGNORECASE),
            "NUMBER": re.compile(r'\b\d+(?:\.\d+)?(?:[KMB]|thousand|million|billion)?\b', re.IGNORECASE),
            "COMPANY": re.compile(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Inc|Corp|Ltd|LLC|Co)\b'),
            "TICKER": re.compile(r'\b[A-Z]{1,5}\b(?=\s|$|[,.])')
        }
        
        for entity_type, pattern in patterns.items():
            for match in pattern.finditer(query):
                entities.append({
                    "text": match.group(0),
                    "type": entity_type,
                    "confidence": 0.85,
                    "start": match.start(),
                    "end": match.end()
                })
        
        return entities
    
    def _classify_intent_optimized(self, query: str, words: List[str]) -> Dict[str, Any]:
        """Optimized intent classification using compiled patterns"""
        query_lower = query.lower()
        word_set = set(words)
        intent_scores = {}
        
        # Vectorized scoring using pre-compiled patterns
        for intent, patterns in self.compiled_patterns.items():
            # Keyword matching using set intersection
            keyword_score = len(word_set.intersection(set(patterns['keywords'])))
            
            # Pattern matching
            pattern_score = sum(2 for pattern in patterns['patterns'] if pattern.search(query_lower))
            
            intent_scores[intent] = keyword_score + pattern_score
        
        # Normalize scores
        total_score = sum(intent_scores.values()) or 1
        normalized_scores = {k: v/total_score for k, v in intent_scores.items()}
        
        # Get primary intent
        primary_intent = max(normalized_scores, key=normalized_scores.get, default="explanation")
        
        return {
            "primary": primary_intent,
            "confidence": normalized_scores.get(primary_intent, 0.5),
            "all_intents": normalized_scores,
            "score_breakdown": intent_scores
        }
    
    def _classify_domains_optimized(self, query: str, words: List[str]) -> List[Dict[str, float]]:
        """Optimized domain classification using set operations"""
        query_words = set(words)
        domain_scores = {}
        
        # Use pre-computed sets for faster intersection
        for domain, keyword_set in self.domain_keyword_sets.items():
            matches = query_words.intersection(keyword_set)
            if matches:
                # Calculate score based on match ratio and frequency
                match_ratio = len(matches) / len(keyword_set)
                frequency_bonus = sum(words.count(match) for match in matches) / len(words)
                domain_scores[domain] = match_ratio + (frequency_bonus * 0.5)
        
        # Sort and return top domains
        sorted_domains = sorted(
            domain_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        return [
            {"domain": domain, "confidence": min(score, 1.0)}
            for domain, score in sorted_domains[:3]  # Top 3 domains
        ]
    
    def _analyze_complexity_optimized(self, query: str, words: List[str]) -> Dict[str, Any]:
        """Enhanced complexity analysis with multiple factors"""
        
        # Calculate various complexity factors
        factors = {
            "length": min(1.0, len(words) / 20),  # Normalize by 20 words
            "unique_ratio": len(set(words)) / max(len(words), 1),
            "avg_word_length": min(1.0, np.mean([len(w) for w in words]) / 8) if words else 0,
            "question_complexity": min(1.0, query.count("?") / 3),
            "conjunction_density": min(1.0, sum(1 for word in words if word in ["and", "or", "but", "however", "therefore"]) / 5),
            "technical_terms": min(1.0, sum(1 for word in words if len(word) > 8) / 10),
            "nested_concepts": min(1.0, len(re.findall(r'\([^)]+\)', query)) / 3)
        }
        
        # Weighted complexity score
        weights = {
            "length": 0.20,
            "unique_ratio": 0.15,
            "avg_word_length": 0.10,
            "question_complexity": 0.15,
            "conjunction_density": 0.15,
            "technical_terms": 0.15,
            "nested_concepts": 0.10
        }
        
        complexity_score = sum(factors[k] * weights[k] for k in weights)
        
        # Determine complexity level
        if complexity_score < 0.3:
            level = "simple"
        elif complexity_score < 0.6:
            level = "moderate"
        else:
            level = "complex"
        
        return {
            "level": level,
            "score": complexity_score,
            "factors": factors,
            "estimated_processing_time": self._estimate_processing_time(complexity_score),
            "recommended_agents": self._recommend_agent_count(complexity_score)
        }
    
    def _extract_concepts_optimized(self, words: List[str]) -> List[str]:
        """Optimized concept extraction with ranking"""
        # Stop words for filtering
        stop_words = {
            "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
            "of", "with", "by", "is", "are", "was", "were", "be", "been", "have",
            "has", "had", "do", "does", "did", "will", "would", "could", "should",
            "this", "that", "these", "those", "they", "them", "their", "there"
        }
        
        # Filter meaningful words
        meaningful_words = [
            word for word in words 
            if len(word) > 3 and word not in stop_words
        ]
        
        # Count frequency and rank by importance
        word_freq = defaultdict(int)
        for word in meaningful_words:
            word_freq[word] += 1
        
        # Sort by frequency and importance (length as tiebreaker)
        sorted_concepts = sorted(
            word_freq.items(),
            key=lambda x: (x[1], len(x[0])),
            reverse=True
        )
        
        return [concept for concept, _ in sorted_concepts[:10]]
    
    def _calculate_semantic_features(self, query: str, words: List[str]) -> Dict[str, Any]:
        """Calculate semantic features for enhanced analysis"""
        return {
            "lexical_diversity": len(set(words)) / max(len(words), 1),
            "information_density": len([w for w in words if len(w) > 6]) / max(len(words), 1),
            "question_words": len([w for w in words if w in ["what", "how", "why", "when", "where", "who"]]),
            "temporal_references": len(re.findall(r'\b(?:yesterday|today|tomorrow|last|next|current|recent|future)\b', query.lower())),
            "quantitative_terms": len(re.findall(r'\b(?:many|much|most|few|several|all|some|any)\b', query.lower())),
            "certainty_indicators": len(re.findall(r'\b(?:definitely|certainly|probably|maybe|possibly|might|could)\b', query.lower()))
        }
    
    def _determine_capabilities(
        self, 
        intent: Dict[str, Any],
        domains: List[Dict[str, float]],
        complexity: Dict[str, Any]
    ) -> List[str]:
        """Determine required capabilities based on analysis"""
        capabilities = ["web_search", "synthesis"]  # Base capabilities
        
        # Add intent-based capabilities
        intent_capabilities = {
            "comparison": ["comparison_engine", "structured_analysis"],
            "analysis": ["data_analysis", "reasoning_engine", "statistical_analysis"],
            "prediction": ["trend_analysis", "forecasting", "time_series_analysis"],
            "explanation": ["knowledge_base", "educational_content"],
            "research": ["deep_search", "source_validation", "information_synthesis"]
        }
        
        primary_intent = intent["primary"]
        if primary_intent in intent_capabilities:
            capabilities.extend(intent_capabilities[primary_intent])
        
        # Add domain-based capabilities
        if domains:
            top_domain = domains[0]
            if top_domain["confidence"] > 0.3:
                domain_capabilities = {
                    "financial": ["market_data", "financial_analysis", "economic_indicators"],
                    "scientific": ["academic_search", "paper_analysis", "research_validation"],
                    "technical": ["code_analysis", "technical_docs", "system_architecture"],
                    "medical": ["medical_knowledge", "clinical_data", "health_information"],
                    "legal": ["legal_database", "case_law", "regulatory_compliance"]
                }
                
                domain = top_domain["domain"]
                if domain in domain_capabilities:
                    capabilities.extend(domain_capabilities[domain])
        
        # Add complexity-based capabilities
        if complexity["level"] in ["moderate", "complex"]:
            capabilities.extend(["deep_reasoning", "multi_step_analysis"])
        
        if complexity["level"] == "complex":
            capabilities.extend(["expert_coordination", "advanced_synthesis"])
        
        return list(set(capabilities))  # Remove duplicates
    
    def _estimate_processing_time(self, complexity_score: float) -> int:
        """Estimate processing time in seconds based on complexity"""
        base_time = 30  # 30 seconds base
        return int(base_time * (1 + complexity_score * 2))
    
    def _recommend_agent_count(self, complexity_score: float) -> int:
        """Recommend number of agents based on complexity"""
        if complexity_score < 0.3:
            return 1
        elif complexity_score < 0.6:
            return 2
        else:
            return 3
    
    def get_analysis_stats(self) -> Dict[str, Any]:
        """Get performance statistics"""
        cache_hit_rate = (
            self.stats["cache_hits"] / max(self.stats["total_queries"], 1)
        )
        
        return {
            **self.stats,
            "cache_hit_rate": cache_hit_rate,
            "cache_size": len(self.analysis_cache),
            "domain_count": len(self.domain_keywords)
        }
    
    def clear_cache(self):
        """Clear analysis cache"""
        self.analysis_cache.clear()
        logger.info("Query analysis cache cleared")

# Global optimized analyzer instance
optimized_query_analyzer = OptimizedQueryAnalyzer()
