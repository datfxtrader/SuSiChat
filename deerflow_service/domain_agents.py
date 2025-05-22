"""
Specialized Domain Agents for Advanced Research

This module implements domain-specific research agents that provide
specialized knowledge and analysis capabilities for different fields.
"""

import asyncio
import json
import logging
import time
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from abc import ABC, abstractmethod

# Import our reasoning engine
from reasoning_engine import reasoning_engine, Evidence, EvidenceType

logger = logging.getLogger("domain_agents")

@dataclass
class DomainInsight:
    """Represents a domain-specific insight"""
    domain: str
    insight_type: str
    content: str
    confidence: float
    supporting_evidence: List[str]
    implications: List[str]

class BaseDomainAgent(ABC):
    """Base class for all domain-specific agents"""
    
    def __init__(self, domain_name: str):
        self.domain_name = domain_name
        self.specialized_keywords = []
        self.analysis_patterns = {}
        
    @abstractmethod
    async def analyze_query(self, query: str) -> Dict[str, Any]:
        """Analyze if query is relevant to this domain"""
        pass
    
    @abstractmethod
    async def process_evidence(self, evidence: List[Evidence]) -> List[DomainInsight]:
        """Process evidence with domain-specific expertise"""
        pass
    
    @abstractmethod
    async def generate_recommendations(self, insights: List[DomainInsight]) -> List[str]:
        """Generate domain-specific recommendations"""
        pass

class FinancialAnalystAgent(BaseDomainAgent):
    """Specialized agent for financial and market analysis"""
    
    def __init__(self):
        super().__init__("Financial Analysis")
        self.specialized_keywords = [
            "market", "trading", "investment", "stock", "forex", "currency",
            "price", "volatility", "portfolio", "asset", "risk", "return",
            "bull", "bear", "trend", "support", "resistance", "volume"
        ]
        
        self.analysis_patterns = {
            "trend_analysis": ["uptrend", "downtrend", "sideways", "breakout"],
            "risk_indicators": ["volatility", "drawdown", "correlation", "beta"],
            "market_sentiment": ["bullish", "bearish", "neutral", "optimistic", "pessimistic"]
        }
    
    async def analyze_query(self, query: str) -> Dict[str, Any]:
        """Analyze if query is financial in nature"""
        query_lower = query.lower()
        
        relevance_score = 0
        detected_concepts = []
        
        for keyword in self.specialized_keywords:
            if keyword in query_lower:
                relevance_score += 1
                detected_concepts.append(keyword)
        
        # Normalize relevance score
        relevance_score = min(1.0, relevance_score / 5)
        
        # Determine analysis type
        analysis_type = "general"
        if any(word in query_lower for word in ["compare", "vs", "versus"]):
            analysis_type = "comparative"
        elif any(word in query_lower for word in ["trend", "forecast", "predict"]):
            analysis_type = "predictive"
        elif any(word in query_lower for word in ["risk", "safe", "volatile"]):
            analysis_type = "risk_assessment"
        
        return {
            "is_relevant": relevance_score > 0.3,
            "relevance_score": relevance_score,
            "detected_concepts": detected_concepts,
            "analysis_type": analysis_type,
            "recommended_tools": ["market_data", "financial_news", "economic_indicators"]
        }
    
    async def process_evidence(self, evidence: List[Evidence]) -> List[DomainInsight]:
        """Process evidence with financial expertise"""
        insights = []
        
        # Group evidence by financial concepts
        market_evidence = []
        risk_evidence = []
        trend_evidence = []
        
        for ev in evidence:
            content_lower = ev.content.lower()
            
            if any(word in content_lower for word in ["market", "price", "trading"]):
                market_evidence.append(ev)
            if any(word in content_lower for word in ["risk", "volatile", "safe"]):
                risk_evidence.append(ev)
            if any(word in content_lower for word in ["trend", "rise", "fall", "increase", "decrease"]):
                trend_evidence.append(ev)
        
        # Generate market insights
        if market_evidence:
            market_insight = await self._analyze_market_evidence(market_evidence)
            if market_insight:
                insights.append(market_insight)
        
        # Generate risk insights
        if risk_evidence:
            risk_insight = await self._analyze_risk_evidence(risk_evidence)
            if risk_insight:
                insights.append(risk_insight)
        
        # Generate trend insights
        if trend_evidence:
            trend_insight = await self._analyze_trend_evidence(trend_evidence)
            if trend_insight:
                insights.append(trend_insight)
        
        return insights
    
    async def _analyze_market_evidence(self, evidence: List[Evidence]) -> Optional[DomainInsight]:
        """Analyze market-related evidence"""
        if not evidence:
            return None
        
        avg_credibility = sum(e.credibility_score for e in evidence) / len(evidence)
        
        # Look for market indicators
        indicators = []
        for ev in evidence:
            content_lower = ev.content.lower()
            if "bull" in content_lower or "positive" in content_lower:
                indicators.append("bullish_sentiment")
            elif "bear" in content_lower or "negative" in content_lower:
                indicators.append("bearish_sentiment")
            elif "volatile" in content_lower:
                indicators.append("high_volatility")
        
        content = f"Market analysis reveals {len(indicators)} key indicators: {', '.join(set(indicators))}"
        
        return DomainInsight(
            domain="Financial Markets",
            insight_type="market_analysis",
            content=content,
            confidence=avg_credibility,
            supporting_evidence=[e.source for e in evidence[:3]],
            implications=["Market conditions may impact investment decisions", "Consider risk management strategies"]
        )
    
    async def _analyze_risk_evidence(self, evidence: List[Evidence]) -> Optional[DomainInsight]:
        """Analyze risk-related evidence"""
        if not evidence:
            return None
        
        avg_credibility = sum(e.credibility_score for e in evidence) / len(evidence)
        
        risk_level = "moderate"
        risk_factors = []
        
        for ev in evidence:
            content_lower = ev.content.lower()
            if any(word in content_lower for word in ["high risk", "volatile", "dangerous"]):
                risk_level = "high"
                risk_factors.append("volatility")
            elif any(word in content_lower for word in ["safe", "stable", "low risk"]):
                risk_level = "low"
                risk_factors.append("stability")
        
        content = f"Risk analysis indicates {risk_level} risk level with factors: {', '.join(set(risk_factors))}"
        
        return DomainInsight(
            domain="Risk Assessment",
            insight_type="risk_analysis",
            content=content,
            confidence=avg_credibility,
            supporting_evidence=[e.source for e in evidence[:3]],
            implications=["Risk assessment should inform position sizing", "Diversification may be beneficial"]
        )
    
    async def _analyze_trend_evidence(self, evidence: List[Evidence]) -> Optional[DomainInsight]:
        """Analyze trend-related evidence"""
        if not evidence:
            return None
        
        avg_credibility = sum(e.credibility_score for e in evidence) / len(evidence)
        
        trend_direction = "unclear"
        trend_strength = "weak"
        
        positive_indicators = 0
        negative_indicators = 0
        
        for ev in evidence:
            content_lower = ev.content.lower()
            if any(word in content_lower for word in ["increase", "rise", "growth", "up"]):
                positive_indicators += 1
            elif any(word in content_lower for word in ["decrease", "fall", "decline", "down"]):
                negative_indicators += 1
        
        if positive_indicators > negative_indicators:
            trend_direction = "upward"
        elif negative_indicators > positive_indicators:
            trend_direction = "downward"
        
        if abs(positive_indicators - negative_indicators) > 2:
            trend_strength = "strong"
        
        content = f"Trend analysis shows {trend_direction} direction with {trend_strength} momentum"
        
        return DomainInsight(
            domain="Trend Analysis",
            insight_type="trend_analysis",
            content=content,
            confidence=avg_credibility,
            supporting_evidence=[e.source for e in evidence[:3]],
            implications=["Trend analysis can guide entry/exit timing", "Monitor for trend reversal signals"]
        )
    
    async def generate_recommendations(self, insights: List[DomainInsight]) -> List[str]:
        """Generate financial recommendations based on insights"""
        recommendations = []
        
        market_insights = [i for i in insights if i.insight_type == "market_analysis"]
        risk_insights = [i for i in insights if i.insight_type == "risk_analysis"]
        trend_insights = [i for i in insights if i.insight_type == "trend_analysis"]
        
        if market_insights:
            recommendations.append("Consider current market conditions in investment decisions")
        
        if risk_insights:
            high_risk_insights = [i for i in risk_insights if "high" in i.content.lower()]
            if high_risk_insights:
                recommendations.append("Implement strict risk management due to elevated risk factors")
            else:
                recommendations.append("Standard risk management protocols appear sufficient")
        
        if trend_insights:
            upward_trends = [i for i in trend_insights if "upward" in i.content.lower()]
            if upward_trends:
                recommendations.append("Positive trend momentum may support long positions")
            else:
                recommendations.append("Monitor trend developments before making directional bets")
        
        # Generic recommendations
        recommendations.extend([
            "Diversify across multiple assets to reduce concentration risk",
            "Regular portfolio rebalancing recommended",
            "Stay informed about market developments and economic indicators"
        ])
        
        return recommendations

class ScientificResearchAgent(BaseDomainAgent):
    """Specialized agent for scientific and academic research"""
    
    def __init__(self):
        super().__init__("Scientific Research")
        self.specialized_keywords = [
            "study", "research", "experiment", "data", "analysis", "methodology",
            "hypothesis", "theory", "evidence", "peer-reviewed", "journal",
            "correlation", "causation", "statistical", "significant"
        ]
    
    async def analyze_query(self, query: str) -> Dict[str, Any]:
        """Analyze if query is scientific in nature"""
        query_lower = query.lower()
        
        relevance_score = 0
        detected_concepts = []
        
        for keyword in self.specialized_keywords:
            if keyword in query_lower:
                relevance_score += 1
                detected_concepts.append(keyword)
        
        relevance_score = min(1.0, relevance_score / 5)
        
        # Determine research type
        research_type = "general"
        if any(word in query_lower for word in ["experiment", "trial", "test"]):
            research_type = "experimental"
        elif any(word in query_lower for word in ["survey", "poll", "questionnaire"]):
            research_type = "observational"
        elif any(word in query_lower for word in ["meta-analysis", "review"]):
            research_type = "meta_analysis"
        
        return {
            "is_relevant": relevance_score > 0.3,
            "relevance_score": relevance_score,
            "detected_concepts": detected_concepts,
            "research_type": research_type,
            "recommended_tools": ["academic_search", "peer_review_filter", "citation_analysis"]
        }
    
    async def process_evidence(self, evidence: List[Evidence]) -> List[DomainInsight]:
        """Process evidence with scientific expertise"""
        insights = []
        
        # Filter for high-quality scientific evidence
        scientific_evidence = [e for e in evidence if e.type in [
            EvidenceType.STATISTICAL, EvidenceType.EMPIRICAL, EvidenceType.EXPERT_OPINION
        ]]
        
        if scientific_evidence:
            methodology_insight = await self._analyze_methodology(scientific_evidence)
            if methodology_insight:
                insights.append(methodology_insight)
            
            statistical_insight = await self._analyze_statistical_evidence(scientific_evidence)
            if statistical_insight:
                insights.append(statistical_insight)
        
        return insights
    
    async def _analyze_methodology(self, evidence: List[Evidence]) -> Optional[DomainInsight]:
        """Analyze research methodology quality"""
        if not evidence:
            return None
        
        methodology_indicators = []
        for ev in evidence:
            content_lower = ev.content.lower()
            if "randomized" in content_lower:
                methodology_indicators.append("randomized_controlled")
            if "double-blind" in content_lower:
                methodology_indicators.append("double_blind")
            if "peer-reviewed" in content_lower:
                methodology_indicators.append("peer_reviewed")
        
        quality_score = len(set(methodology_indicators)) / 3  # Max 3 indicators
        
        content = f"Methodology analysis reveals {len(set(methodology_indicators))} quality indicators: {', '.join(set(methodology_indicators))}"
        
        return DomainInsight(
            domain="Research Methodology",
            insight_type="methodology_analysis",
            content=content,
            confidence=quality_score,
            supporting_evidence=[e.source for e in evidence[:3]],
            implications=["Methodology quality affects result reliability", "Higher quality studies carry more weight"]
        )
    
    async def _analyze_statistical_evidence(self, evidence: List[Evidence]) -> Optional[DomainInsight]:
        """Analyze statistical significance and patterns"""
        if not evidence:
            return None
        
        statistical_evidence = [e for e in evidence if e.type == EvidenceType.STATISTICAL]
        
        if not statistical_evidence:
            return None
        
        significance_indicators = []
        for ev in statistical_evidence:
            content_lower = ev.content.lower()
            if any(phrase in content_lower for phrase in ["p < 0.05", "significant", "statistically"]):
                significance_indicators.append("statistical_significance")
            if any(phrase in content_lower for phrase in ["confidence interval", "ci"]):
                significance_indicators.append("confidence_intervals")
        
        avg_credibility = sum(e.credibility_score for e in statistical_evidence) / len(statistical_evidence)
        
        content = f"Statistical analysis shows {len(significance_indicators)} significance indicators across {len(statistical_evidence)} sources"
        
        return DomainInsight(
            domain="Statistical Analysis",
            insight_type="statistical_analysis",
            content=content,
            confidence=avg_credibility,
            supporting_evidence=[e.source for e in statistical_evidence[:3]],
            implications=["Statistical significance supports conclusions", "Sample size and methodology matter"]
        )
    
    async def generate_recommendations(self, insights: List[DomainInsight]) -> List[str]:
        """Generate scientific research recommendations"""
        recommendations = [
            "Prioritize peer-reviewed sources for maximum credibility",
            "Look for replication studies to confirm findings",
            "Consider sample sizes when evaluating study conclusions",
            "Check for potential conflicts of interest in research funding"
        ]
        
        methodology_insights = [i for i in insights if i.insight_type == "methodology_analysis"]
        if methodology_insights and any(i.confidence > 0.7 for i in methodology_insights):
            recommendations.insert(0, "High-quality methodology detected - findings likely reliable")
        
        return recommendations

class NewsIntelligenceAgent(BaseDomainAgent):
    """Specialized agent for news and current events analysis"""
    
    def __init__(self):
        super().__init__("News Intelligence")
        self.specialized_keywords = [
            "news", "breaking", "report", "today", "yesterday", "recent",
            "current", "latest", "update", "development", "announced"
        ]
    
    async def analyze_query(self, query: str) -> Dict[str, Any]:
        """Analyze if query is news-related"""
        query_lower = query.lower()
        
        relevance_score = 0
        detected_concepts = []
        
        for keyword in self.specialized_keywords:
            if keyword in query_lower:
                relevance_score += 1
                detected_concepts.append(keyword)
        
        # Check for time-sensitive indicators
        time_indicators = ["today", "yesterday", "this week", "recent", "latest", "current"]
        time_relevance = sum(1 for indicator in time_indicators if indicator in query_lower)
        
        relevance_score = min(1.0, (relevance_score + time_relevance) / 5)
        
        return {
            "is_relevant": relevance_score > 0.2,
            "relevance_score": relevance_score,
            "detected_concepts": detected_concepts,
            "time_sensitivity": "high" if time_relevance > 0 else "low",
            "recommended_tools": ["news_search", "real_time_feeds", "sentiment_analysis"]
        }
    
    async def process_evidence(self, evidence: List[Evidence]) -> List[DomainInsight]:
        """Process evidence with news intelligence"""
        insights = []
        
        # Analyze news recency and sentiment
        recent_news = []
        sentiment_evidence = []
        
        for ev in evidence:
            content_lower = ev.content.lower()
            if any(word in content_lower for word in ["today", "yesterday", "breaking", "just"]):
                recent_news.append(ev)
            if any(word in content_lower for word in ["positive", "negative", "optimistic", "pessimistic"]):
                sentiment_evidence.append(ev)
        
        if recent_news:
            recency_insight = DomainInsight(
                domain="News Recency",
                insight_type="recency_analysis",
                content=f"Found {len(recent_news)} recent news sources with current information",
                confidence=0.8,
                supporting_evidence=[e.source for e in recent_news[:3]],
                implications=["Information is current and relevant", "May require ongoing monitoring"]
            )
            insights.append(recency_insight)
        
        if sentiment_evidence:
            sentiment_insight = await self._analyze_sentiment(sentiment_evidence)
            if sentiment_insight:
                insights.append(sentiment_insight)
        
        return insights
    
    async def _analyze_sentiment(self, evidence: List[Evidence]) -> Optional[DomainInsight]:
        """Analyze sentiment in news evidence"""
        if not evidence:
            return None
        
        positive_count = 0
        negative_count = 0
        
        for ev in evidence:
            content_lower = ev.content.lower()
            if any(word in content_lower for word in ["positive", "good", "success", "improvement"]):
                positive_count += 1
            elif any(word in content_lower for word in ["negative", "bad", "failure", "decline"]):
                negative_count += 1
        
        overall_sentiment = "neutral"
        if positive_count > negative_count:
            overall_sentiment = "positive"
        elif negative_count > positive_count:
            overall_sentiment = "negative"
        
        confidence = abs(positive_count - negative_count) / len(evidence)
        
        content = f"Sentiment analysis shows {overall_sentiment} tone across {len(evidence)} sources"
        
        return DomainInsight(
            domain="News Sentiment",
            insight_type="sentiment_analysis",
            content=content,
            confidence=confidence,
            supporting_evidence=[e.source for e in evidence[:3]],
            implications=["Sentiment may influence public perception", "Monitor for sentiment shifts"]
        )
    
    async def generate_recommendations(self, insights: List[DomainInsight]) -> List[str]:
        """Generate news intelligence recommendations"""
        recommendations = [
            "Verify information through multiple independent sources",
            "Consider the publication date and source credibility",
            "Monitor for updates as news situations develop"
        ]
        
        recency_insights = [i for i in insights if i.insight_type == "recency_analysis"]
        if recency_insights:
            recommendations.insert(0, "Current information available - consider real-time monitoring")
        
        return recommendations

class DomainAgentOrchestrator:
    """Orchestrates multiple domain agents for comprehensive analysis"""
    
    def __init__(self):
        self.agents = {
            "financial": FinancialAnalystAgent(),
            "scientific": ScientificResearchAgent(),
            "news": NewsIntelligenceAgent()
        }
        logger.info("DomainAgentOrchestrator initialized with {} agents", len(self.agents))
    
    async def analyze_query_domains(self, query: str) -> Dict[str, Any]:
        """Analyze which domains are relevant for the query"""
        domain_analysis = {}
        
        for domain_name, agent in self.agents.items():
            analysis = await agent.analyze_query(query)
            domain_analysis[domain_name] = analysis
        
        # Determine primary domain
        relevant_domains = {name: analysis for name, analysis in domain_analysis.items() 
                          if analysis["is_relevant"]}
        
        primary_domain = None
        if relevant_domains:
            primary_domain = max(relevant_domains, key=lambda x: relevant_domains[x]["relevance_score"])
        
        return {
            "domain_analysis": domain_analysis,
            "relevant_domains": list(relevant_domains.keys()),
            "primary_domain": primary_domain,
            "multi_domain": len(relevant_domains) > 1
        }
    
    async def process_with_domain_expertise(
        self, 
        query: str, 
        evidence: List[Evidence]
    ) -> Dict[str, Any]:
        """Process evidence using relevant domain agents"""
        
        # First, determine relevant domains
        domain_analysis = await self.analyze_query_domains(query)
        relevant_domains = domain_analysis["relevant_domains"]
        
        if not relevant_domains:
            # Use general processing
            relevant_domains = ["scientific"]  # Default to scientific for general analysis
        
        all_insights = []
        all_recommendations = []
        domain_reports = {}
        
        # Process with each relevant domain agent
        for domain_name in relevant_domains:
            if domain_name in self.agents:
                agent = self.agents[domain_name]
                
                # Get domain-specific insights
                insights = await agent.process_evidence(evidence)
                recommendations = await agent.generate_recommendations(insights)
                
                domain_reports[domain_name] = {
                    "insights": [
                        {
                            "type": insight.insight_type,
                            "content": insight.content,
                            "confidence": insight.confidence,
                            "implications": insight.implications
                        } for insight in insights
                    ],
                    "recommendations": recommendations
                }
                
                all_insights.extend(insights)
                all_recommendations.extend(recommendations)
        
        return {
            "domain_analysis": domain_analysis,
            "domain_reports": domain_reports,
            "consolidated_insights": all_insights,
            "consolidated_recommendations": list(set(all_recommendations)),  # Remove duplicates
            "expertise_applied": relevant_domains
        }

# Global domain agent orchestrator
domain_orchestrator = DomainAgentOrchestrator()