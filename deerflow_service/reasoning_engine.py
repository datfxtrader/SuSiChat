"""
Advanced Reasoning Engine for DeerFlow Agent System

This module implements sophisticated reasoning capabilities including:
- Logical inference and deduction
- Hypothesis formation and testing
- Evidence evaluation and synthesis
- Causal analysis and relationship mapping
"""

import asyncio
import json
import logging
import time
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import re

logger = logging.getLogger("reasoning_engine")

class ReasoningType(Enum):
    DEDUCTIVE = "deductive"
    INDUCTIVE = "inductive"
    ABDUCTIVE = "abductive"
    CAUSAL = "causal"
    COMPARATIVE = "comparative"
    ANALYTICAL = "analytical"

class EvidenceType(Enum):
    STATISTICAL = "statistical"
    TESTIMONIAL = "testimonial"
    EXPERT_OPINION = "expert_opinion"
    EMPIRICAL = "empirical"
    HISTORICAL = "historical"
    THEORETICAL = "theoretical"

@dataclass
class Evidence:
    """Represents a piece of evidence with metadata"""
    content: str
    source: str
    type: EvidenceType
    credibility_score: float
    relevance_score: float
    timestamp: str
    supporting_claims: List[str]
    contradicting_claims: List[str]

@dataclass
class Hypothesis:
    """Represents a hypothesis with supporting evidence"""
    statement: str
    confidence_level: float
    supporting_evidence: List[Evidence]
    contradicting_evidence: List[Evidence]
    reasoning_chain: List[str]
    test_criteria: List[str]
    status: str  # "proposed", "testing", "supported", "refuted"

@dataclass
class Conclusion:
    """Represents a logical conclusion"""
    statement: str
    reasoning_type: ReasoningType
    premises: List[str]
    evidence_base: List[Evidence]
    confidence_score: float
    limitations: List[str]
    implications: List[str]

class ReasoningEngine:
    """Advanced reasoning engine with multiple inference methods"""
    
    def __init__(self):
        self.reasoning_history: List[Dict[str, Any]] = []
        self.knowledge_graph: Dict[str, Any] = {}
        
        # Credibility scoring patterns
        self.high_credibility_sources = [
            r"\.edu", r"\.org", r"\.gov", 
            r"nature\.com", r"science\.org", r"pubmed",
            r"reuters\.com", r"bbc\.com", r"guardian\.com"
        ]
        
        self.medium_credibility_sources = [
            r"\.com", r"wikipedia\.org", r"forbes\.com",
            r"bloomberg\.com", r"economist\.com"
        ]
        
        logger.info("ReasoningEngine initialized")
    
    def evaluate_evidence_credibility(self, evidence: Evidence) -> float:
        """Evaluate the credibility of a piece of evidence"""
        base_score = 0.5
        
        # Source credibility
        source_score = 0.3
        for pattern in self.high_credibility_sources:
            if re.search(pattern, evidence.source, re.IGNORECASE):
                source_score = 0.9
                break
        else:
            for pattern in self.medium_credibility_sources:
                if re.search(pattern, evidence.source, re.IGNORECASE):
                    source_score = 0.6
                    break
        
        # Content quality indicators
        content_score = 0.5
        quality_indicators = [
            r"study", r"research", r"analysis", r"data", 
            r"statistics", r"peer.?reviewed", r"methodology"
        ]
        
        indicator_count = sum(1 for pattern in quality_indicators 
                            if re.search(pattern, evidence.content, re.IGNORECASE))
        content_score = min(0.9, 0.3 + (indicator_count * 0.1))
        
        # Evidence type weighting
        type_weights = {
            EvidenceType.STATISTICAL: 0.9,
            EvidenceType.EMPIRICAL: 0.8,
            EvidenceType.EXPERT_OPINION: 0.7,
            EvidenceType.HISTORICAL: 0.6,
            EvidenceType.TESTIMONIAL: 0.4,
            EvidenceType.THEORETICAL: 0.5
        }
        
        type_score = type_weights.get(evidence.type, 0.5)
        
        # Calculate final credibility score
        final_score = (source_score * 0.4 + content_score * 0.3 + type_score * 0.3)
        return min(1.0, max(0.1, final_score))
    
    def classify_evidence_type(self, content: str, source: str) -> EvidenceType:
        """Classify evidence based on content and source patterns"""
        content_lower = content.lower()
        source_lower = source.lower()
        
        # Statistical evidence patterns
        if any(pattern in content_lower for pattern in 
               ["statistics", "data shows", "survey", "poll", "percentage", "study found"]):
            return EvidenceType.STATISTICAL
        
        # Expert opinion patterns
        if any(pattern in content_lower for pattern in 
               ["expert", "professor", "researcher", "according to", "analyst"]):
            return EvidenceType.EXPERT_OPINION
        
        # Empirical evidence patterns
        if any(pattern in content_lower for pattern in 
               ["experiment", "trial", "test", "observation", "measurement"]):
            return EvidenceType.EMPIRICAL
        
        # Historical evidence patterns
        if any(pattern in content_lower for pattern in 
               ["historically", "in the past", "previous", "archive", "record"]):
            return EvidenceType.HISTORICAL
        
        # Theoretical evidence patterns
        if any(pattern in content_lower for pattern in 
               ["theory", "model", "framework", "hypothesis", "suggests"]):
            return EvidenceType.THEORETICAL
        
        return EvidenceType.TESTIMONIAL
    
    def extract_claims(self, content: str) -> List[str]:
        """Extract key claims from content"""
        # Simple claim extraction - can be enhanced with NLP
        sentences = re.split(r'[.!?]+', content)
        claims = []
        
        claim_indicators = [
            r"shows that", r"indicates", r"suggests", r"proves", 
            r"demonstrates", r"reveals", r"found that", r"according to"
        ]
        
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) > 20:  # Filter out very short sentences
                for indicator in claim_indicators:
                    if re.search(indicator, sentence, re.IGNORECASE):
                        claims.append(sentence)
                        break
        
        return claims[:5]  # Limit to top 5 claims
    
    def process_evidence(self, raw_evidence: List[Dict[str, Any]]) -> List[Evidence]:
        """Process raw evidence into structured Evidence objects"""
        processed_evidence = []
        
        for item in raw_evidence:
            content = item.get("content", "")
            source = item.get("url", item.get("source", ""))
            
            # Classify evidence type
            evidence_type = self.classify_evidence_type(content, source)
            
            # Create evidence object
            evidence = Evidence(
                content=content,
                source=source,
                type=evidence_type,
                credibility_score=0.0,  # Will be calculated
                relevance_score=item.get("relevance_score", 0.5),
                timestamp=str(time.time()),
                supporting_claims=self.extract_claims(content),
                contradicting_claims=[]
            )
            
            # Calculate credibility
            evidence.credibility_score = self.evaluate_evidence_credibility(evidence)
            
            processed_evidence.append(evidence)
        
        return processed_evidence
    
    def form_hypotheses(self, query: str, evidence: List[Evidence]) -> List[Hypothesis]:
        """Form hypotheses based on available evidence"""
        hypotheses = []
        
        # Analyze query to understand what we're investigating
        query_lower = query.lower()
        
        # Group evidence by themes
        themes = self._identify_themes(evidence)
        
        for theme, theme_evidence in themes.items():
            if len(theme_evidence) >= 2:  # Need at least 2 pieces of evidence
                # Generate hypothesis for this theme
                hypothesis = self._generate_hypothesis_for_theme(
                    query, theme, theme_evidence
                )
                if hypothesis:
                    hypotheses.append(hypothesis)
        
        return hypotheses
    
    def _identify_themes(self, evidence: List[Evidence]) -> Dict[str, List[Evidence]]:
        """Group evidence by common themes"""
        themes = {}
        
        # Simple keyword-based theme identification
        theme_keywords = {
            "effectiveness": ["effective", "successful", "works", "impact"],
            "trends": ["trend", "increase", "decrease", "growth", "decline"],
            "comparison": ["better", "worse", "superior", "inferior", "compared"],
            "causation": ["cause", "effect", "result", "lead to", "because"],
            "benefits": ["benefit", "advantage", "positive", "improve"],
            "challenges": ["challenge", "problem", "issue", "difficulty", "risk"]
        }
        
        for evidence_item in evidence:
            content_lower = evidence_item.content.lower()
            
            for theme, keywords in theme_keywords.items():
                if any(keyword in content_lower for keyword in keywords):
                    if theme not in themes:
                        themes[theme] = []
                    themes[theme].append(evidence_item)
        
        return themes
    
    def _generate_hypothesis_for_theme(
        self, 
        query: str, 
        theme: str, 
        evidence: List[Evidence]
    ) -> Optional[Hypothesis]:
        """Generate a hypothesis for a specific theme"""
        
        if not evidence:
            return None
        
        # Calculate average credibility
        avg_credibility = sum(e.credibility_score for e in evidence) / len(evidence)
        
        # Generate hypothesis statement based on theme
        hypothesis_templates = {
            "effectiveness": f"The approach discussed in '{query}' is effective",
            "trends": f"There is a significant trend related to '{query}'",
            "comparison": f"There are notable differences in '{query}'",
            "causation": f"There is a causal relationship in '{query}'",
            "benefits": f"'{query}' provides substantial benefits",
            "challenges": f"'{query}' faces significant challenges"
        }
        
        statement = hypothesis_templates.get(theme, f"'{query}' shows interesting patterns")
        
        # Generate reasoning chain
        reasoning_chain = [
            f"Identified {len(evidence)} pieces of evidence related to {theme}",
            f"Average evidence credibility: {avg_credibility:.2f}",
            f"Evidence sources include: {', '.join(set(e.source[:30] + '...' for e in evidence[:3]))}"
        ]
        
        # Generate test criteria
        test_criteria = [
            "Requires additional evidence from high-credibility sources",
            "Should be validated against contradictory evidence",
            "Needs verification from multiple independent sources"
        ]
        
        return Hypothesis(
            statement=statement,
            confidence_level=min(0.8, avg_credibility),
            supporting_evidence=evidence,
            contradicting_evidence=[],
            reasoning_chain=reasoning_chain,
            test_criteria=test_criteria,
            status="proposed"
        )
    
    def perform_logical_inference(
        self, 
        premises: List[str], 
        evidence: List[Evidence],
        reasoning_type: ReasoningType = ReasoningType.DEDUCTIVE
    ) -> List[Conclusion]:
        """Perform logical inference based on premises and evidence"""
        conclusions = []
        
        if reasoning_type == ReasoningType.DEDUCTIVE:
            conclusions.extend(self._deductive_reasoning(premises, evidence))
        elif reasoning_type == ReasoningType.INDUCTIVE:
            conclusions.extend(self._inductive_reasoning(premises, evidence))
        elif reasoning_type == ReasoningType.COMPARATIVE:
            conclusions.extend(self._comparative_reasoning(premises, evidence))
        
        return conclusions
    
    def _deductive_reasoning(self, premises: List[str], evidence: List[Evidence]) -> List[Conclusion]:
        """Perform deductive reasoning"""
        conclusions = []
        
        # Simple deductive pattern: If A and B, then C
        if len(premises) >= 2:
            high_credibility_evidence = [e for e in evidence if e.credibility_score > 0.7]
            
            if len(high_credibility_evidence) >= 2:
                conclusion_statement = f"Based on the available evidence, {premises[0]} and {premises[1]} lead to logical conclusions"
                
                conclusion = Conclusion(
                    statement=conclusion_statement,
                    reasoning_type=ReasoningType.DEDUCTIVE,
                    premises=premises,
                    evidence_base=high_credibility_evidence,
                    confidence_score=min(e.credibility_score for e in high_credibility_evidence),
                    limitations=["Deductive reasoning limited by premise validity"],
                    implications=["Further investigation recommended for validation"]
                )
                conclusions.append(conclusion)
        
        return conclusions
    
    def _inductive_reasoning(self, premises: List[str], evidence: List[Evidence]) -> List[Conclusion]:
        """Perform inductive reasoning"""
        conclusions = []
        
        # Pattern recognition in evidence
        if len(evidence) >= 3:
            patterns = self._identify_patterns(evidence)
            
            for pattern in patterns:
                conclusion_statement = f"Pattern analysis suggests: {pattern}"
                
                conclusion = Conclusion(
                    statement=conclusion_statement,
                    reasoning_type=ReasoningType.INDUCTIVE,
                    premises=premises,
                    evidence_base=evidence,
                    confidence_score=0.7,  # Inductive reasoning has inherent uncertainty
                    limitations=["Inductive conclusions are probabilistic, not certain"],
                    implications=["Pattern may not hold for all cases"]
                )
                conclusions.append(conclusion)
        
        return conclusions
    
    def _comparative_reasoning(self, premises: List[str], evidence: List[Evidence]) -> List[Conclusion]:
        """Perform comparative reasoning"""
        conclusions = []
        
        # Look for comparative evidence
        comparative_evidence = [e for e in evidence if any(
            word in e.content.lower() for word in 
            ["better", "worse", "superior", "inferior", "compared", "versus", "vs"]
        )]
        
        if comparative_evidence:
            conclusion_statement = "Comparative analysis reveals significant differences"
            
            conclusion = Conclusion(
                statement=conclusion_statement,
                reasoning_type=ReasoningType.COMPARATIVE,
                premises=premises,
                evidence_base=comparative_evidence,
                confidence_score=sum(e.credibility_score for e in comparative_evidence) / len(comparative_evidence),
                limitations=["Comparison validity depends on similar contexts"],
                implications=["Different contexts may yield different results"]
            )
            conclusions.append(conclusion)
        
        return conclusions
    
    def _identify_patterns(self, evidence: List[Evidence]) -> List[str]:
        """Identify patterns in evidence"""
        patterns = []
        
        # Simple pattern identification
        common_terms = {}
        for ev in evidence:
            words = re.findall(r'\b\w+\b', ev.content.lower())
            for word in words:
                if len(word) > 4:  # Skip short words
                    common_terms[word] = common_terms.get(word, 0) + 1
        
        # Find frequently mentioned terms
        frequent_terms = [term for term, count in common_terms.items() if count >= 2]
        
        if frequent_terms:
            patterns.append(f"Frequently mentioned concepts: {', '.join(frequent_terms[:5])}")
        
        # Check for trend indicators
        trend_words = ["increase", "decrease", "grow", "decline", "rise", "fall"]
        trend_mentions = [word for word in trend_words if any(
            word in ev.content.lower() for ev in evidence
        )]
        
        if trend_mentions:
            patterns.append(f"Trend indicators present: {', '.join(trend_mentions)}")
        
        return patterns
    
    def synthesize_reasoning_report(
        self, 
        query: str,
        evidence: List[Evidence],
        hypotheses: List[Hypothesis],
        conclusions: List[Conclusion]
    ) -> Dict[str, Any]:
        """Create a comprehensive reasoning report"""
        
        # Calculate overall confidence
        evidence_confidence = sum(e.credibility_score for e in evidence) / len(evidence) if evidence else 0
        hypothesis_confidence = sum(h.confidence_level for h in hypotheses) / len(hypotheses) if hypotheses else 0
        conclusion_confidence = sum(c.confidence_score for c in conclusions) / len(conclusions) if conclusions else 0
        
        overall_confidence = (evidence_confidence + hypothesis_confidence + conclusion_confidence) / 3
        
        report = {
            "query": query,
            "reasoning_summary": {
                "total_evidence_pieces": len(evidence),
                "hypotheses_formed": len(hypotheses),
                "conclusions_reached": len(conclusions),
                "overall_confidence": overall_confidence,
                "reasoning_timestamp": time.time()
            },
            "evidence_analysis": {
                "high_credibility_count": len([e for e in evidence if e.credibility_score > 0.7]),
                "evidence_types": list(set(e.type.value for e in evidence)),
                "source_diversity": len(set(e.source for e in evidence))
            },
            "key_hypotheses": [
                {
                    "statement": h.statement,
                    "confidence": h.confidence_level,
                    "status": h.status,
                    "evidence_count": len(h.supporting_evidence)
                } for h in hypotheses[:3]  # Top 3 hypotheses
            ],
            "logical_conclusions": [
                {
                    "statement": c.statement,
                    "reasoning_type": c.reasoning_type.value,
                    "confidence": c.confidence_score,
                    "limitations": c.limitations[:2]  # Top 2 limitations
                } for c in conclusions[:3]  # Top 3 conclusions
            ],
            "reasoning_insights": {
                "evidence_quality": "High" if evidence_confidence > 0.7 else "Medium" if evidence_confidence > 0.5 else "Low",
                "logical_consistency": "Strong" if overall_confidence > 0.7 else "Moderate",
                "recommendation": "Further research recommended" if overall_confidence < 0.6 else "Conclusions well-supported"
            }
        }
        
        return report

# Global reasoning engine instance
reasoning_engine = ReasoningEngine()