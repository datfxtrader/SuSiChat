
import re
import logging
from typing import List, Dict, Any, Set
from collections import defaultdict

logger = logging.getLogger("query_analyzer")

class EnhancedQueryAnalyzer:
    """Advanced query analysis with pattern matching"""
    
    def __init__(self):
        # Intent patterns
        self.intent_patterns = {
            "comparison": {
                "keywords": ["compare", "versus", "vs", "difference", "better", "worse"],
                "patterns": [r"\w+ vs \w+", r"compare \w+ to \w+", r"difference between \w+ and \w+"]
            },
            "analysis": {
                "keywords": ["analyze", "evaluate", "assess", "examine", "investigate"],
                "patterns": [r"analyze \w+", r"evaluate the \w+", r"assess \w+"]
            },
            "explanation": {
                "keywords": ["explain", "what is", "how does", "why", "describe"],
                "patterns": [r"what is \w+", r"explain \w+", r"how does \w+ work"]
            },
            "prediction": {
                "keywords": ["predict", "forecast", "future", "will", "trend"],
                "patterns": [r"predict \w+", r"future of \w+", r"\w+ trends"]
            }
        }
        
        # Domain classifiers
        self.domain_keywords = {
            "financial": ["stock", "market", "trading", "investment", "currency", "bitcoin", "forex", "portfolio", "economic"],
            "scientific": ["research", "study", "experiment", "hypothesis", "theory", "data", "analysis"],
            "technical": ["code", "programming", "software", "algorithm", "system", "technology", "development"],
            "medical": ["health", "disease", "treatment", "symptom", "diagnosis", "medicine", "patient"],
            "legal": ["law", "legal", "court", "regulation", "compliance", "contract", "case"]
        }
    
    def analyze_query(self, query: str) -> Dict[str, Any]:
        """Comprehensive query analysis"""
        
        # Extract basic information
        words = self._tokenize(query)
        entities = self._extract_entities(query, words)
        
        # Determine intent
        intent = self._classify_intent(query, words)
        
        # Classify domains
        domains = self._classify_domains(query, words)
        
        # Analyze complexity
        complexity = self._analyze_complexity(query, words)
        
        # Extract key concepts
        concepts = self._extract_concepts(words)
        
        # Determine required capabilities
        capabilities = self._determine_capabilities(intent, domains, complexity)
        
        return {
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
                "sentence_count": len([s for s in query.split('.') if s.strip()])
            }
        }
    
    def _tokenize(self, query: str) -> List[str]:
        """Simple tokenization"""
        # Remove punctuation and split
        import string
        translator = str.maketrans('', '', string.punctuation)
        clean_query = query.translate(translator)
        return [word.lower() for word in clean_query.split() if word.strip()]
    
    def _extract_entities(self, query: str, words: List[str]) -> List[Dict[str, str]]:
        """Extract named entities using simple heuristics"""
        entities = []
        
        # Look for capitalized words (potential proper nouns)
        capitalized_pattern = re.findall(r'\b[A-Z][a-z]+\b', query)
        for word in capitalized_pattern:
            entities.append({
                "text": word,
                "type": "PROPER_NOUN",
                "confidence": 0.7
            })
        
        # Look for numbers
        number_pattern = re.findall(r'\b\d+(?:\.\d+)?\b', query)
        for num in number_pattern:
            entities.append({
                "text": num,
                "type": "NUMBER",
                "confidence": 0.9
            })
        
        # Look for dates
        date_pattern = re.findall(r'\b\d{4}\b|\b\d{1,2}/\d{1,2}/\d{2,4}\b', query)
        for date in date_pattern:
            entities.append({
                "text": date,
                "type": "DATE",
                "confidence": 0.8
            })
        
        return entities
    
    def _classify_intent(self, query: str, words: List[str]) -> Dict[str, Any]:
        """Classify query intent"""
        query_lower = query.lower()
        
        intent_scores = {}
        for intent_type, patterns in self.intent_patterns.items():
            score = 0
            
            # Check keywords
            for keyword in patterns["keywords"]:
                if keyword in query_lower:
                    score += 1
            
            # Check patterns
            for pattern in patterns["patterns"]:
                if re.search(pattern, query_lower):
                    score += 2
            
            intent_scores[intent_type] = score
        
        # Get primary intent
        if not intent_scores or max(intent_scores.values()) == 0:
            primary_intent = "explanation"
            confidence = 0.5
        else:
            primary_intent = max(intent_scores, key=intent_scores.get)
            confidence = intent_scores[primary_intent] / max(1, sum(intent_scores.values()))
        
        return {
            "primary": primary_intent,
            "confidence": confidence,
            "all_intents": intent_scores
        }
    
    def _classify_domains(self, query: str, words: List[str]) -> List[Dict[str, float]]:
        """Classify query domains"""
        query_lower = query.lower()
        
        domain_scores = {}
        for domain, keywords in self.domain_keywords.items():
            score = sum(1 for keyword in keywords if keyword in query_lower)
            if score > 0:
                domain_scores[domain] = score / len(keywords)
        
        # Sort by score
        sorted_domains = sorted(
            domain_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        return [
            {"domain": domain, "confidence": score}
            for domain, score in sorted_domains
        ]
    
    def _analyze_complexity(self, query: str, words: List[str]) -> Dict[str, Any]:
        """Analyze query complexity"""
        # Factors that increase complexity
        complexity_factors = {
            "length": min(1.0, len(words) / 15),  # Normalize by 15 words
            "unique_words": min(1.0, len(set(words)) / len(words) if words else 0),
            "conjunctions": min(1.0, sum(1 for word in words if word in ["and", "or", "but"]) / 3),
            "questions": min(1.0, query.count("?") / 2),
            "technical_terms": min(1.0, sum(1 for word in words if len(word) > 8) / 5)
        }
        
        # Calculate overall complexity
        complexity_score = sum(complexity_factors.values()) / len(complexity_factors)
        
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
            "factors": complexity_factors
        }
    
    def _extract_concepts(self, words: List[str]) -> List[str]:
        """Extract key concepts"""
        # Filter out common stop words
        stop_words = {
            "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
            "of", "with", "by", "is", "are", "was", "were", "be", "been", "have",
            "has", "had", "do", "does", "did", "will", "would", "could", "should"
        }
        
        # Get important words (longer than 3 characters, not stop words)
        concepts = [
            word for word in words 
            if len(word) > 3 and word not in stop_words
        ]
        
        # Remove duplicates while preserving order
        seen = set()
        unique_concepts = []
        for concept in concepts:
            if concept not in seen:
                seen.add(concept)
                unique_concepts.append(concept)
        
        return unique_concepts[:10]  # Top 10 concepts
    
    def _determine_capabilities(
        self, 
        intent: Dict[str, Any],
        domains: List[Dict[str, float]],
        complexity: Dict[str, Any]
    ) -> List[str]:
        """Determine required capabilities"""
        capabilities = ["web_search", "synthesis"]  # Base capabilities
        
        # Add based on intent
        intent_capabilities = {
            "comparison": ["comparison_engine", "structured_analysis"],
            "analysis": ["data_analysis", "reasoning_engine"],
            "prediction": ["trend_analysis", "forecasting"],
            "explanation": ["knowledge_base", "educational_content"]
        }
        
        primary_intent = intent["primary"]
        if primary_intent in intent_capabilities:
            capabilities.extend(intent_capabilities[primary_intent])
        
        # Add based on domains
        if domains and domains[0]["confidence"] > 0.3:
            domain = domains[0]["domain"]
            domain_capabilities = {
                "financial": ["market_data", "financial_analysis"],
                "scientific": ["academic_search", "paper_analysis"],
                "technical": ["code_analysis", "technical_docs"],
                "medical": ["medical_knowledge", "clinical_data"],
                "legal": ["legal_database", "case_law"]
            }
            
            if domain in domain_capabilities:
                capabilities.extend(domain_capabilities[domain])
        
        # Add based on complexity
        if complexity["level"] in ["moderate", "complex"]:
            capabilities.extend(["deep_reasoning", "multi_step_analysis"])
        
        return list(set(capabilities))  # Remove duplicates
