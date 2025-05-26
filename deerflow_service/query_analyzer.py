
import re
import spacy
import time
import logging
import numpy as np
from functools import lru_cache
from typing import Pattern, Dict, List, Any, Optional
from cachetools import LRUCache
from sklearn.feature_extraction.text import TfidfVectorizer

logger = logging.getLogger("query_analyzer")

class OptimizedQueryAnalyzer:
    """Optimized query analyzer with compiled patterns and caching"""
    
    def __init__(self):
        # Pre-compile all regex patterns
        self.compiled_patterns = self._compile_patterns()
        
        # Load spaCy model lazily
        self._nlp = None
        
        # TF-IDF vectorizer for concept extraction
        self.tfidf = TfidfVectorizer(
            max_features=100,
            stop_words='english',
            ngram_range=(1, 2)
        )
        
        # Cache for analysis results
        self.analysis_cache = LRUCache(maxsize=1000)
        
        # Pre-compute domain keyword sets
        self.domain_keywords = {
            "financial": [
                "stock", "market", "investment", "portfolio", "trading",
                "financial", "earnings", "revenue", "profit", "valuation",
                "dividend", "shares", "bond", "fund", "crypto", "bitcoin"
            ],
            "scientific": [
                "research", "study", "experiment", "hypothesis", "data",
                "analysis", "methodology", "peer-reviewed", "scientific",
                "journal", "paper", "findings", "results", "conclusion"
            ],
            "technical": [
                "code", "programming", "software", "algorithm", "system",
                "technology", "development", "api", "framework", "architecture",
                "database", "server", "cloud", "application", "platform"
            ],
            "business": [
                "company", "business", "industry", "market", "strategy",
                "competition", "growth", "sales", "customer", "product",
                "service", "management", "operations", "marketing"
            ],
            "medical": [
                "health", "disease", "treatment", "symptom", "diagnosis",
                "medicine", "patient", "clinical", "therapy", "medical",
                "hospital", "drug", "pharmaceutical", "healthcare"
            ]
        }
        
        self.domain_keyword_sets = {
            domain: set(keywords)
            for domain, keywords in self.domain_keywords.items()
        }
        
        # Intent patterns
        self.intent_patterns = {
            "research": {
                "keywords": ["research", "investigate", "explore", "study", "analyze"],
                "patterns": [
                    r"research\s+(?:about|on|into)",
                    r"investigate\s+(?:the|this|how)",
                    r"find\s+(?:out|information)",
                    r"what\s+(?:is|are|do|does)",
                    r"tell\s+me\s+about"
                ]
            },
            "comparison": {
                "keywords": ["compare", "versus", "vs", "difference", "better"],
                "patterns": [
                    r"compare\s+.*\s+(?:to|with|and)",
                    r".*\s+vs\s+.*",
                    r"difference\s+between",
                    r"which\s+is\s+better",
                    r".*\s+or\s+.*\?"
                ]
            },
            "analysis": {
                "keywords": ["analyze", "evaluate", "assess", "review", "examine"],
                "patterns": [
                    r"analyze\s+(?:the|this|how)",
                    r"evaluate\s+(?:the|this)",
                    r"assess\s+(?:the|this)",
                    r"how\s+(?:good|bad|effective)"
                ]
            },
            "prediction": {
                "keywords": ["predict", "forecast", "future", "trend", "outlook"],
                "patterns": [
                    r"predict\s+(?:the|future)",
                    r"what\s+will\s+happen",
                    r"future\s+of",
                    r"trend\s+(?:in|for)",
                    r"outlook\s+for"
                ]
            },
            "explanation": {
                "keywords": ["explain", "how", "why", "what", "describe"],
                "patterns": [
                    r"explain\s+(?:how|why|what)",
                    r"how\s+does\s+.*\s+work",
                    r"why\s+(?:is|does|do)",
                    r"what\s+causes",
                    r"describe\s+(?:the|how)"
                ]
            }
        }
        
        logger.info("OptimizedQueryAnalyzer initialized")
    
    @property
    def nlp(self):
        """Lazy load spaCy model"""
        if self._nlp is None:
            try:
                self._nlp = spacy.load("en_core_web_sm", disable=["parser"])
            except IOError:
                logger.warning("spaCy model not available, using basic NLP")
                self._nlp = None
        return self._nlp
    
    def _compile_patterns(self) -> Dict[str, Dict[str, List[Pattern]]]:
        """Pre-compile all regex patterns"""
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
        """Cached query analysis with optimization"""
        
        # Check cache
        cache_key = hash(query)
        if cache_key in self.analysis_cache:
            return self.analysis_cache[cache_key]
        
        start_time = time.time()
        
        # Process with spaCy if available
        doc = None
        if self.nlp:
            doc = self.nlp(query)
            words = [token.text.lower() for token in doc if not token.is_stop]
        else:
            words = [word.lower() for word in re.findall(r'\w+', query)]
        
        # Extract features in parallel
        entities = self._extract_entities_optimized(query, doc)
        intent = self._classify_intent_optimized(query, words)
        domains = self._classify_domains_optimized(query, words)
        complexity = self._analyze_complexity_optimized(query, doc, words)
        concepts = self._extract_concepts_nlp(query, doc)
        capabilities = self._determine_capabilities(intent, domains, complexity)
        
        result = {
            "query": query,
            "intent": intent,
            "domains": domains,
            "entities": entities,
            "concepts": concepts,
            "complexity": complexity,
            "capabilities": capabilities,
            "metadata": {
                "word_count": len(words),
                "has_questions": "?" in query,
                "sentence_count": len(query.split('.')),
                "avg_word_length": np.mean([len(word) for word in words]) if words else 0,
                "analysis_time": time.time() - start_time
            }
        }
        
        # Cache result
        self.analysis_cache[cache_key] = result
        
        return result
    
    def _extract_entities_optimized(self, query: str, doc=None) -> List[Dict[str, str]]:
        """Extract entities using spaCy and patterns"""
        entities = []
        
        # Use spaCy's built-in entity recognition if available
        if doc and self.nlp:
            for ent in doc.ents:
                entities.append({
                    "text": ent.text,
                    "type": ent.label_,
                    "confidence": 0.85,
                    "start": ent.start_char,
                    "end": ent.end_char
                })
        
        # Additional pattern-based extraction
        # Numbers with context
        for match in re.finditer(r'(\$?\d+(?:\.\d+)?(?:[KMB])?)', query):
            entities.append({
                "text": match.group(1),
                "type": "MONEY" if "$" in match.group(1) else "NUMBER",
                "confidence": 0.9,
                "start": match.start(),
                "end": match.end()
            })
        
        # Stock symbols
        for match in re.finditer(r'\b[A-Z]{1,5}\b', query):
            if len(match.group()) <= 5:
                entities.append({
                    "text": match.group(),
                    "type": "STOCK_SYMBOL",
                    "confidence": 0.7,
                    "start": match.start(),
                    "end": match.end()
                })
        
        # Companies (simple heuristic)
        company_patterns = [
            r'\b\w+\s+(?:Inc|Corp|Ltd|LLC|Company)\b',
            r'\b(?:Apple|Google|Microsoft|Amazon|Tesla|Meta)\b'
        ]
        
        for pattern in company_patterns:
            for match in re.finditer(pattern, query, re.IGNORECASE):
                entities.append({
                    "text": match.group(),
                    "type": "COMPANY",
                    "confidence": 0.8,
                    "start": match.start(),
                    "end": match.end()
                })
        
        return entities
    
    def _classify_intent_optimized(self, query: str, words: List[str]) -> Dict[str, Any]:
        """Optimized intent classification"""
        query_lower = query.lower()
        intent_scores = {}
        
        # Vectorized scoring
        for intent, patterns in self.compiled_patterns.items():
            keyword_score = sum(1 for kw in patterns['keywords'] if kw in query_lower)
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
            "all_intents": normalized_scores
        }
    
    def _classify_domains_optimized(self, query: str, words: List[str]) -> List[Dict[str, float]]:
        """Optimized domain classification using sets"""
        query_words = set(words)
        domain_scores = {}
        
        # Set intersection for faster matching
        for domain, keyword_set in self.domain_keyword_sets.items():
            matches = query_words.intersection(keyword_set)
            if matches:
                domain_scores[domain] = len(matches) / len(keyword_set)
        
        # Sort and format results
        return [
            {"domain": domain, "confidence": score}
            for domain, score in sorted(
                domain_scores.items(), 
                key=lambda x: x[1], 
                reverse=True
            )
        ]
    
    def _analyze_complexity_optimized(self, query: str, doc, words: List[str]) -> Dict[str, Any]:
        """Enhanced complexity analysis using NLP features"""
        
        # Basic features
        features = {
            "length": len(words) / 15,
            "unique_ratio": len(set(words)) / max(len(words), 1),
            "avg_word_length": np.mean([len(w) for w in words]) / 10 if words else 0,
            "question_marks": query.count("?") / 3,
            "complex_words": sum(1 for w in words if len(w) > 8) / max(len(words), 1)
        }
        
        # Add spaCy features if available
        if doc and self.nlp:
            features.update({
                "entity_density": len(doc.ents) / max(len(words), 1),
                "noun_verb_ratio": self._calculate_pos_ratio(doc),
                "subordinate_clauses": self._count_subordinate_clauses(doc)
            })
        
        # Normalize features
        normalized_features = {
            k: min(1.0, v) for k, v in features.items()
        }
        
        # Calculate weighted score
        weights = {
            "length": 0.2,
            "unique_ratio": 0.15,
            "avg_word_length": 0.15,
            "question_marks": 0.1,
            "complex_words": 0.1,
            "entity_density": 0.1,
            "noun_verb_ratio": 0.1,
            "subordinate_clauses": 0.1
        }
        
        complexity_score = sum(
            normalized_features.get(k, 0) * weights[k] 
            for k in weights
        )
        
        # Determine level
        if complexity_score < 0.3:
            level = "simple"
        elif complexity_score < 0.6:
            level = "moderate"
        else:
            level = "complex"
        
        return {
            "level": level,
            "score": complexity_score,
            "features": normalized_features,
            "estimated_time": self._estimate_processing_time(level),
            "required_agents": self._estimate_agent_count(level)
        }
    
    def _extract_concepts_nlp(self, query: str, doc) -> List[str]:
        """Extract concepts using NLP techniques"""
        
        concepts = []
        
        if doc and self.nlp:
            # Extract noun phrases
            noun_phrases = []
            for chunk in doc.noun_chunks:
                if len(chunk.text) > 3:
                    noun_phrases.append(chunk.text.lower())
            
            # Extract important single words (nouns and verbs)
            important_pos = {'NOUN', 'PROPN', 'VERB'}
            important_words = [
                token.lemma_.lower() 
                for token in doc 
                if token.pos_ in important_pos and len(token.text) > 3
            ]
            
            concepts = list(set(noun_phrases + important_words))
        else:
            # Fallback: extract meaningful words
            words = re.findall(r'\b\w{4,}\b', query.lower())
            concepts = list(set(words))
        
        # Rank by importance (frequency in original text)
        concept_scores = {
            concept: query.lower().count(concept.lower())
            for concept in concepts
        }
        
        # Return top concepts
        sorted_concepts = sorted(
            concept_scores.items(), 
            key=lambda x: x[1], 
            reverse=True
        )
        
        return [concept for concept, _ in sorted_concepts[:10]]
    
    def _calculate_pos_ratio(self, doc) -> float:
        """Calculate part-of-speech ratio for complexity"""
        pos_counts = {}
        for token in doc:
            pos_counts[token.pos_] = pos_counts.get(token.pos_, 0) + 1
        
        nouns = pos_counts.get('NOUN', 0) + pos_counts.get('PROPN', 0)
        verbs = pos_counts.get('VERB', 0)
        
        if verbs == 0:
            return 1.0
        
        return min(1.0, nouns / verbs / 3)  # Normalize
    
    def _count_subordinate_clauses(self, doc) -> float:
        """Count subordinate clauses as complexity indicator"""
        subordinators = {'because', 'although', 'while', 'if', 'when', 'since', 'unless'}
        count = sum(1 for token in doc if token.text.lower() in subordinators)
        return min(1.0, count / 3)  # Normalize to 0-1
    
    def _estimate_processing_time(self, complexity_level: str) -> int:
        """Estimate processing time in seconds"""
        time_estimates = {
            "simple": 30,
            "moderate": 90,
            "complex": 180
        }
        return time_estimates.get(complexity_level, 60)
    
    def _estimate_agent_count(self, complexity_level: str) -> int:
        """Estimate required number of agents"""
        agent_estimates = {
            "simple": 1,
            "moderate": 2,
            "complex": 3
        }
        return agent_estimates.get(complexity_level, 1)
    
    def _determine_capabilities(
        self, 
        intent: Dict[str, Any], 
        domains: List[Dict[str, float]], 
        complexity: Dict[str, Any]
    ) -> List[str]:
        """Determine required capabilities"""
        capabilities = []
        
        # Based on intent
        intent_capabilities = {
            "research": ["web_search", "data_analysis"],
            "comparison": ["web_search", "data_analysis", "synthesis"],
            "analysis": ["data_analysis", "reasoning", "synthesis"],
            "prediction": ["data_analysis", "modeling", "reasoning"],
            "explanation": ["knowledge_base", "reasoning", "synthesis"]
        }
        
        primary_intent = intent.get("primary", "explanation")
        capabilities.extend(intent_capabilities.get(primary_intent, []))
        
        # Based on domains
        if domains:
            primary_domain = domains[0]["domain"]
            domain_capabilities = {
                "financial": ["financial_data", "market_analysis"],
                "technical": ["code_analysis", "technical_research"],
                "scientific": ["academic_search", "peer_review"],
                "medical": ["medical_research", "clinical_data"],
                "business": ["market_research", "competitive_analysis"]
            }
            capabilities.extend(domain_capabilities.get(primary_domain, []))
        
        # Based on complexity
        if complexity["level"] == "complex":
            capabilities.extend(["multi_agent", "coordination", "synthesis"])
        
        return list(set(capabilities))  # Remove duplicates

# Global optimized analyzer instance
query_analyzer = OptimizedQueryAnalyzer()
