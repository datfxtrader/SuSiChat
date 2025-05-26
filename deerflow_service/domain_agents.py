"""
Specialized Domain Agents for Advanced Research

This module implements domain-specific research agents that provide
specialized knowledge and analysis capabilities for different fields.
"""

import asyncio
import json
import logging
import time
import hashlib
import yaml
from datetime import datetime
from typing import Dict, List, Any, Optional, Union, Protocol
from dataclasses import dataclass, asdict
from enum import Enum
from collections import defaultdict
from functools import lru_cache
from contextlib import asynccontextmanager

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

class BaseDomainAgent:
    """Enhanced base class for all domain-specific agents with optimizations"""

    def __init__(self, domain_name: str):
        self.domain_name = domain_name
        self.specialized_keywords = []
        self.insight_history = []

        # Optimization components
        self.performance_monitor = PerformanceMonitor()
        self.cache_manager = CachedAnalysisManager()
        self.relevance_scorer = RelevanceScorer()
        self.confidence_calculator = ConfidenceCalculator()

        # Error tracking
        self._error_history = []

        # Initialize keyword categories
        self._keyword_categories = {
            "primary": [],
            "secondary": [],
            "contextual": []
        }

    def set_keyword_categories(self, categories: Dict[str, List[str]]):
        """Set categorized keywords for weighted relevance scoring"""
        self._keyword_categories.update(categories)

    def is_relevant(self, query: str) -> float:
        """Enhanced relevance calculation with weighted scoring"""
        return self.relevance_scorer.calculate_relevance(query, self._keyword_categories)

    async def analyze_query(self, query: str) -> Dict[str, Any]:
        """Enhanced query analysis with caching and error handling"""
        try:
            async with self.performance_monitor.measure("query_analysis"):
                # Use cache if available
                cache_key = self.cache_manager.get_cache_key(query, [])

                return await self.cache_manager.get_or_compute(
                    cache_key,
                    lambda: self._perform_analysis(query)
                )
        except Exception as e:
            logger.error(f"Query analysis failed for {self.domain_name}: {e}")
            return self._fallback_analysis(query)

    async def _perform_analysis(self, query: str) -> Dict[str, Any]:
        """Core analysis logic"""
        relevance = self.is_relevant(query)

        return {
            "domain": self.domain_name,
            "relevance": relevance,
            "analysis": f"Enhanced domain analysis for {self.domain_name}",
            "recommendations": await self._generate_recommendations(query),
            "confidence": min(0.9, relevance + 0.2),
            "metadata": {
                "processing_time": time.time(),
                "cache_used": False
            }
        }

    async def _generate_recommendations(self, query: str) -> List[str]:
        """Generate domain-specific recommendations"""
        # Base implementation - subclasses should override
        return [f"Consider {self.domain_name} perspective on: {query[:50]}..."]

    def _fallback_analysis(self, query: str) -> Dict[str, Any]:
        """Fallback analysis when main analysis fails"""
        return {
            "domain": self.domain_name,
            "relevance": 0.1,
            "analysis": f"Fallback analysis for {self.domain_name}",
            "recommendations": [],
            "confidence": 0.3,
            "error": "Analysis failed, using fallback"
        }

    async def process_evidence(self, evidence: List) -> List:
        """Enhanced evidence processing with concurrent execution and error handling"""
        try:
            async with self.performance_monitor.measure("evidence_processing"):
                return await self._process_evidence_concurrently(evidence)
        except Exception as e:
            logger.error(f"Evidence processing failed for {self.domain_name}: {e}")
            return await self._process_evidence_safely(evidence)

    async def _process_evidence_concurrently(self, evidence: List) -> List:
        """Process evidence concurrently for better performance"""
        # Group evidence by type for better processing
        grouped_evidence = self._group_evidence(evidence)

        # Process each group concurrently
        tasks = []
        for evidence_type, evidence_group in grouped_evidence.items():
            tasks.append(self._process_evidence_group(evidence_type, evidence_group))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Flatten results and filter out exceptions
        insights = []
        for result in results:
            if isinstance(result, list):
                insights.extend(result)
            elif not isinstance(result, Exception):
                insights.append(result)

        return insights

    def _group_evidence(self, evidence: List) -> Dict[str, List]:
        """Group evidence by type or relevance for better processing"""
        groups = defaultdict(list)

        for ev in evidence:
            # Simple grouping by content length - can be enhanced
            content_length = len(getattr(ev, 'content', ''))
            if content_length > 1000:
                groups['detailed'].append(ev)
            elif content_length > 200:
                groups['medium'].append(ev)
            else:
                groups['brief'].append(ev)

        return dict(groups)

    async def _process_evidence_group(self, group_type: str, evidence_group: List) -> List:
        """Process a group of evidence"""
        insights = []

        for ev in evidence_group:
            if self._is_domain_relevant(ev):
                insight = await self._generate_insight_async(ev)
                if insight:
                    insights.append(insight)

        return insights

    async def _process_evidence_safely(self, evidence: List) -> List:
        """Safe evidence processing with individual error handling"""
        insights = []
        errors = []

        for ev in evidence:
            try:
                if self._is_domain_relevant(ev):
                    insight = await self._generate_insight_async(ev)
                    if insight:
                        insights.append(insight)
            except Exception as e:
                error_info = {
                    "evidence_id": getattr(ev, 'id', 'unknown'),
                    "error": str(e),
                    "timestamp": time.time(),
                    "domain": self.domain_name
                }
                errors.append(error_info)
                logger.error(f"Failed to process evidence in {self.domain_name}: {e}")

        if errors:
            self._error_history.extend(errors)

        return insights

    def _is_domain_relevant(self, evidence) -> bool:
        """Enhanced domain relevance check"""
        content = getattr(evidence, 'content', '')

        # Check against all keyword categories
        all_keywords = []
        for category_keywords in self._keyword_categories.values():
            all_keywords.extend(category_keywords)

        if not all_keywords:
            all_keywords = self.specialized_keywords

        return any(keyword in content.lower() for keyword in all_keywords)

    async def _generate_insight_async(self, evidence) -> Optional[Dict]:
        """Enhanced async insight generation"""
        try:
            content = getattr(evidence, 'content', '')
            source = getattr(evidence, 'source', '')

            # Calculate confidence using the enhanced calculator
            confidence = self.confidence_calculator.calculate_confidence([evidence])

            return {
                "domain": self.domain_name,
                "content": content[:200] + "..." if len(content) > 200 else content,
                "confidence": confidence,
                "source": source,
                "timestamp": time.time(),
                "processing_method": "async_enhanced"
            }
        except Exception as e:
            logger.error(f"Insight generation failed: {e}")
            return None

    def _generate_insight(self, evidence) -> Optional[Dict]:
        """Legacy sync method maintained for compatibility"""
        return {
            "domain": self.domain_name,
            "content": getattr(evidence, 'content', '')[:200] + "...",
            "confidence": 0.7,
            "timestamp": time.time()
        }

    def get_performance_stats(self) -> Dict[str, Any]:
        """Get performance statistics for this agent"""
        return {
            "domain": self.domain_name,
            "error_count": len(self._error_history),
            "recent_errors": self._error_history[-5:] if self._error_history else [],
            "performance_metrics": {
                operation: self.performance_monitor.get_stats(operation)
                for operation in self.performance_monitor.metrics.keys()
            }
        }

class FinancialAnalystAgent(BaseDomainAgent):
    def __init__(self, config=None):
        super().__init__("Financial Analysis")

        # Load configuration
        self.config = config or domain_config

        if self.config and CONFIG_AVAILABLE:
            # Load keywords from configuration
            keyword_categories = self.config.get_keyword_categories("financial")
            if keyword_categories:
                self.set_keyword_categories(keyword_categories)

            # Load thresholds
            self.relevance_threshold = self.config.get_threshold("financial", "relevance_score")
            self.confidence_threshold = self.config.get_threshold("financial", "confidence_threshold")
        else:
            # Fallback to hardcoded configuration
            self.set_keyword_categories({
                "primary": [
                    "market", "trading", "investment", "portfolio", "stock", "bond",
                    "forex", "currency", "financial", "economics"
                ],
                "secondary": [
                    "commodity", "derivative", "equity", "debt", "monetary", "fiscal",
                    "inflation", "interest rate", "volatility", "risk"
                ],
                "contextual": [
                    "central bank", "fed", "ecb", "bank of japan", "earnings",
                    "revenue", "profit", "loss", "dividend", "yield"
                ]
            })
            self.relevance_threshold = 0.3
            self.confidence_threshold = 0.6

        # Legacy keywords for compatibility
        self.specialized_keywords = [
            "market", "trading", "investment", "portfolio", "stock", "bond",
            "forex", "currency", "commodity", "derivative", "equity", "debt",
            "financial", "economics", "monetary", "fiscal", "inflation", 
            "interest rate", "central bank", "fed", "ecb", "bank of japan"
        ]

    async def analyze_query(self, query: str) -> Dict[str, Any]:
        """Enhanced financial query analysis with concurrent processing"""
        try:
            async with self.performance_monitor.measure("financial_query_analysis"):
                # Get base analysis
                base_analysis = await super().analyze_query(query)

                # Perform concurrent specialized analysis
                financial_tasks = [
                    self._identify_financial_aspects(query),
                    self._assess_market_context(query),
                    self._assess_risk_indicators(query),
                    self._identify_investment_opportunities(query)
                ]

                results = await asyncio.gather(*financial_tasks, return_exceptions=True)

                # Process results safely
                financial_aspects, market_context, risk_assessment, investment_angle = [
                    result if not isinstance(result, Exception) else {}
                    for result in results
                ]

                base_analysis.update({
                    "financial_aspects": financial_aspects,
                    "market_context": market_context,
                    "risk_assessment": risk_assessment,
                    "investment_angle": investment_angle,
                    "analysis_depth": "enhanced_concurrent"
                })

                return base_analysis

        except Exception as e:
            logger.error(f"Enhanced financial analysis failed: {e}")
            return await super().analyze_query(query)

    async def _identify_financial_aspects(self, query: str) -> List[str]:
        """Identify specific financial aspects in the query"""
        aspects = []
        query_lower = query.lower()

        aspect_keywords = {
            "market_analysis": ["market", "trend", "analysis", "outlook"],
            "risk_management": ["risk", "volatility", "hedge", "protection"],
            "investment_strategy": ["investment", "strategy", "portfolio", "allocation"],
            "trading": ["trading", "buy", "sell", "position"],
            "valuation": ["valuation", "price", "value", "worth"],
            "technical_analysis": ["chart", "support", "resistance", "indicator"],
            "fundamental_analysis": ["earnings", "revenue", "pe ratio", "fundamentals"]
        }

        for aspect, keywords in aspect_keywords.items():
            if any(keyword in query_lower for keyword in keywords):
                aspects.append(aspect)

        return aspects

    async def _assess_market_context(self, query: str) -> Dict[str, Any]:
        """Enhanced market context assessment"""
        market_type = await self._identify_market_type(query)
        time_horizon = await self._identify_time_horizon(query)

        return {
            "market_type": market_type,
            "time_horizon": time_horizon,
            "market_conditions": "neutral",  # Could be enhanced with real market data
            "geographical_focus": self._identify_geographical_focus(query),
            "market_cap_focus": self._identify_market_cap_focus(query)
        }

    async def _identify_market_type(self, query: str) -> str:
        """Enhanced market type identification"""
        query_lower = query.lower()

        market_indicators = {
            "equity": ["stock", "equity", "share", "nasdaq", "s&p", "dow"],
            "fixed_income": ["bond", "fixed income", "treasury", "corporate bond"],
            "forex": ["forex", "currency", "fx", "exchange rate", "usd", "eur"],
            "commodity": ["commodity", "gold", "oil", "wheat", "silver", "copper"],
            "crypto": ["bitcoin", "crypto", "blockchain", "ethereum", "defi"],
            "real_estate": ["real estate", "reit", "property", "housing market"]
        }

        for market_type, indicators in market_indicators.items():
            if any(indicator in query_lower for indicator in indicators):
                return market_type

        return "general"

    async def _identify_time_horizon(self, query: str) -> str:
        """Enhanced time horizon identification"""
        query_lower = query.lower()

        time_indicators = {
            "short_term": ["short term", "day trading", "scalping", "intraday", "swing"],
            "medium_term": ["medium term", "quarterly", "annual", "1 year", "2 year"],
            "long_term": ["long term", "retirement", "pension", "decades", "10 year"]
        }

        for horizon, indicators in time_indicators.items():
            if any(indicator in query_lower for indicator in indicators):
                return horizon

        return "medium_term"

    def _identify_geographical_focus(self, query: str) -> str:
        """Identify geographical market focus"""
        query_lower = query.lower()

        geo_indicators = {
            "us": ["usa", "us", "america", "nasdaq", "nyse", "s&p"],
            "europe": ["europe", "eu", "ftse", "dax", "cac"],
            "asia": ["asia", "japan", "china", "nikkei", "hang seng"],
            "emerging": ["emerging", "developing", "brics"],
            "global": ["global", "international", "worldwide"]
        }

        for region, indicators in geo_indicators.items():
            if any(indicator in query_lower for indicator in indicators):
                return region

        return "global"

    def _identify_market_cap_focus(self, query: str) -> str:
        """Identify market capitalization focus"""
        query_lower = query.lower()

        if any(word in query_lower for word in ["large cap", "blue chip", "mega cap"]):
            return "large_cap"
        elif any(word in query_lower for word in ["small cap", "micro cap"]):
            return "small_cap"
        elif any(word in query_lower for word in ["mid cap", "medium cap"]):
            return "mid_cap"

        return "all_cap"

    async def _assess_risk_indicators(self, query: str) -> Dict[str, Any]:
        """Enhanced risk assessment with async processing"""
        query_lower = query.lower()

        # Concurrent risk analysis
        risk_tasks = [
            self._determine_risk_level(query_lower),
            self._identify_risk_factors(query_lower),
        ]

        risk_level, risk_factors = await asyncio.gather(*risk_tasks)

        return {
            "risk_level": risk_level,
            "risk_factors": risk_factors,
            "mitigation_suggestions": self._suggest_risk_mitigation(risk_level),
            "risk_score": self._calculate_risk_score(risk_level, risk_factors)
        }

    async def _determine_risk_level(self, query_lower: str) -> str:
        """Determine risk level from query"""
        if any(word in query_lower for word in ["safe", "conservative", "stable", "low risk"]):
            return "low"
        elif any(word in query_lower for word in ["aggressive", "high risk", "speculative", "volatile"]):
            return "high"
        elif any(word in query_lower for word in ["moderate", "balanced", "medium risk"]):
            return "medium"
        else:
            return "medium"  # Default

    async def _identify_risk_factors(self, query_lower: str) -> List[str]:
        """Enhanced risk factor identification"""
        risk_factors = []

        risk_keywords = {
            "market_risk": ["market crash", "volatility", "bear market", "recession"],
            "credit_risk": ["default", "bankruptcy", "credit rating", "debt"],
            "liquidity_risk": ["liquidity", "illiquid", "trading volume", "market depth"],
            "currency_risk": ["exchange rate", "currency", "devaluation", "forex"],
            "interest_rate_risk": ["interest rate", "fed", "monetary policy", "inflation"],
            "sector_risk": ["sector concentration", "industry specific", "cyclical"],
            "geopolitical_risk": ["geopolitical", "war", "sanctions", "political"]
        }

        for risk_type, keywords in risk_keywords.items():
            if any(keyword in query_lower for keyword in keywords):
                risk_factors.append(risk_type)

        return risk_factors

    def _calculate_risk_score(self, risk_level: str, risk_factors: List[str]) -> float:
        """Calculate numerical risk score"""
        base_scores = {"low": 0.2, "medium": 0.5, "high": 0.8}
        base_score = base_scores.get(risk_level, 0.5)

        # Adjust for number of risk factors
        factor_adjustment = min(0.3, len(risk_factors) * 0.05)

        return min(1.0, base_score + factor_adjustment)

    def _suggest_risk_mitigation(self, risk_level: str) -> List[str]:
        """Enhanced risk mitigation suggestions"""
        base_suggestions = {
            "high": [
                "Implement strict position sizing",
                "Use stop-loss orders",
                "Diversify across asset classes",
                "Consider hedging strategies",
                "Monitor correlations closely"
            ],
            "medium": [
                "Maintain balanced diversification", 
                "Regular portfolio rebalancing",
                "Risk monitoring dashboards",
                "Periodic stress testing"
            ],
            "low": [
                "Asset allocation review",
                "Regular rebalancing",
                "Monitor for style drift",
                "Consider inflation protection"
            ]
        }

        return base_suggestions.get(risk_level, base_suggestions["medium"])

    async def _identify_investment_opportunities(self, query: str) -> Dict[str, Any]:
        """Enhanced investment opportunity identification"""
        query_lower = query.lower()

        opportunities = {
            "asset_classes": await self._identify_asset_classes(query_lower),
            "sectors": self._identify_sectors(query_lower),
            "strategies": self._identify_strategies(query_lower),
            "themes": self._identify_investment_themes(query_lower),
            "opportunity_score": 0.0
        }

        # Calculate opportunity score
        total_opportunities = sum(len(v) if isinstance(v, list) else 0 for v in opportunities.values())
        opportunities["opportunity_score"] = min(1.0, total_opportunities * 0.1)

        return opportunities

    async def _identify_asset_classes(self, query_lower: str) -> List[str]:
        """Identify relevant asset classes"""
        asset_classes = []

        asset_indicators = {
            "equities": ["stock", "equity", "share", "public company"],
            "bonds": ["bond", "fixed income", "treasury", "corporate debt"],
            "real_estate": ["real estate", "reit", "property", "land"],
            "commodities": ["commodity", "gold", "oil", "agricultural"],
            "crypto": ["crypto", "bitcoin", "blockchain", "digital asset"],
            "alternatives": ["private equity", "hedge fund", "venture capital"]
        }

        for asset_class, indicators in asset_indicators.items():
            if any(indicator in query_lower for indicator in indicators):
                asset_classes.append(asset_class)

        return asset_classes

    def _identify_sectors(self, query_lower: str) -> List[str]:
        """Identify relevant sectors"""
        sectors = []

        sector_keywords = {
            "technology": ["tech", "software", "ai", "cloud", "semiconductor"],
            "healthcare": ["healthcare", "pharmaceutical", "biotech", "medical"],
            "financials": ["bank", "insurance", "financial services", "fintech"],
            "energy": ["energy", "oil", "gas", "renewable", "solar"],
            "consumer": ["consumer", "retail", "e-commerce", "brands"],
            "industrials": ["industrial", "manufacturing", "aerospace", "defense"]
        }

        for sector, keywords in sector_keywords.items():
            if any(keyword in query_lower for keyword in keywords):
                sectors.append(sector)

        return sectors

    def _identify_strategies(self, query_lower: str) -> List[str]:
        """Identify investment strategies"""
        strategies = []

        strategy_keywords = {
            "value_investing": ["value", "undervalued", "pe ratio", "book value"],
            "growth_investing": ["growth", "momentum", "expanding", "high growth"],
            "income_investing": ["dividend", "income", "yield", "distribution"],
            "index_investing": ["index", "passive", "etf", "tracking"],
            "quantitative": ["quantitative", "algorithmic", "systematic", "quant"]
        }

        for strategy, keywords in strategy_keywords.items():
            if any(keyword in query_lower for keyword in keywords):
                strategies.append(strategy)

        return strategies

    def _identify_investment_themes(self, query_lower: str) -> List[str]:
        """Identify investment themes"""
        themes = []

        theme_keywords = {
            "esg": ["esg", "sustainable", "green", "environmental"],
            "digital_transformation": ["digital", "automation", "ai", "machine learning"],
            "demographics": ["aging", "millennials", "urbanization", "demographics"],
            "globalization": ["emerging markets", "international", "global trade"]
        }

        for theme, keywords in theme_keywords.items():
            if any(keyword in query_lower for keyword in keywords):
                themes.append(theme)

        return themes

class TechnicalAnalystAgent(BaseDomainAgent):
    def __init__(self):
        super().__init__("Technical Analysis")

        # Enhanced categorized keywords
        self.set_keyword_categories({
            "primary": [
                "technical analysis", "chart", "pattern", "indicator", "signal",
                "support", "resistance", "trend", "momentum"
            ],
            "secondary": [
                "oscillator", "moving average", "rsi", "macd", "bollinger bands",
                "fibonacci", "candlestick", "volume", "breakout", "reversal"
            ],
            "contextual": [
                "bullish", "bearish", "overbought", "oversold", "divergence",
                "consolidation", "pennant", "flag", "triangle", "head and shoulders"
            ]
        })

        # Legacy keywords for compatibility
        self.specialized_keywords = [
            "technical analysis", "chart", "pattern", "indicator", "signal",
            "support", "resistance", "trend", "momentum", "oscillator",
            "moving average", "rsi", "macd", "bollinger bands", "fibonacci",
            "candlestick", "volume", "breakout", "reversal"
        ]

class DomainAgentOrchestrator:
    """Enhanced orchestrator with async context management and optimizations"""

    def __init__(self):
        self.agents = {
            "financial": FinancialAnalystAgent(),
            "technical": TechnicalAnalystAgent(),
            "market": MarketAnalystAgent(),
            "risk": RiskAnalystAgent()
        }
        self.analysis_history = []
        self.performance_monitor = PerformanceMonitor()
        self.cache_manager = CachedAnalysisManager(cache_size=256)
        self._initialized = False

    async def __aenter__(self):
        """Async context manager entry"""
        await self._initialize_agents()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit with cleanup"""
        await self._cleanup_agents()

    async def _initialize_agents(self):
        """Initialize all agents concurrently"""
        if self._initialized:
            return

        init_tasks = []
        for name, agent in self.agents.items():
            if hasattr(agent, 'initialize'):
                init_tasks.append(agent.initialize())

        if init_tasks:
            await asyncio.gather(*init_tasks, return_exceptions=True)

        self._initialized = True
        logger.info("Domain agents initialized successfully")

    async def _cleanup_agents(self):
        """Cleanup agent resources"""
        cleanup_tasks = []
        for agent in self.agents.values():
            if hasattr(agent, 'cleanup'):
                cleanup_tasks.append(agent.cleanup())

        if cleanup_tasks:
            await asyncio.gather(*cleanup_tasks, return_exceptions=True)

        logger.info("Domain agents cleaned up")

    async def process_with_domain_expertise(
        self, 
        query: str, 
        evidence: Optional[List] = None
    ) -> Dict[str, Any]:
        """Enhanced processing with caching and error handling"""

        try:
            async with self.performance_monitor.measure("domain_orchestration"):
                # Check cache first
                cache_key = self._generate_cache_key(query, evidence)

                return await self.cache_manager.get_or_compute(
                    cache_key,
                    lambda: self._perform_domain_analysis(query, evidence)
                )
        except Exception as e:
            logger.error(f"Domain orchestration failed: {e}")
            return await self._fallback_analysis(query)

    def _generate_cache_key(self, query: str, evidence: Optional[List] = None) -> str:
        """Generate cache key for the analysis"""
        evidence_ids = []
        if evidence:
            evidence_ids = [getattr(ev, 'id', str(hash(str(ev)))) for ev in evidence[:10]]  # Limit for performance

        return self.cache_manager.get_cache_key(query, evidence_ids)

    async def _perform_domain_analysis(
        self, 
        query: str, 
        evidence: Optional[List] = None
    ) -> Dict[str, Any]:
        """Core domain analysis logic"""

        # Determine relevant agents
        relevant_agents = await self._select_relevant_agents(query)

        if not relevant_agents:
            return await self._fallback_analysis(query)

        # Parallel processing with error handling
        analysis_results = await self._execute_parallel_analysis(
            query, evidence, relevant_agents
        )

        # Consolidate results
        consolidated = await self._consolidate_insights(
            query, analysis_results, relevant_agents
        )

        # Store in history
        self._store_analysis_history(query, relevant_agents, consolidated)

        return consolidated

    async def _execute_parallel_analysis(
        self,
        query: str,
        evidence: Optional[List],
        relevant_agents: Dict[str, Any]
    ) -> List[Any]:
        """Execute analysis tasks in parallel with error handling"""

        analysis_tasks = []

        # Query analysis tasks
        for agent_name, agent in relevant_agents.items():
            analysis_tasks.append(
                self._safe_agent_analysis(agent, "analyze_query", query, agent_name)
            )

        # Evidence processing tasks
        if evidence:
            for agent_name, agent in relevant_agents.items():
                analysis_tasks.append(
                    self._safe_agent_analysis(agent, "process_evidence", evidence, agent_name)
                )

        # Execute all tasks
        results = await asyncio.gather(*analysis_tasks, return_exceptions=True)

        # Filter out exceptions and None results
        valid_results = [
            result for result in results 
            if not isinstance(result, Exception) and result is not None
        ]

        return valid_results

    async def _safe_agent_analysis(
        self, 
        agent, 
        method_name: str, 
        data: Any, 
        agent_name: str
    ) -> Optional[Any]:
        """Safely execute agent analysis method"""
        try:
            method = getattr(agent, method_name)
            result = await method(data)

            # Add metadata
            if isinstance(result, dict):
                result["agent_name"] = agent_name
                result["method"] = method_name
                result["processing_time"] = time.time()

            return result

        except Exception as e:
            logger.error(f"Agent {agent_name}.{method_name} failed: {e}")
            return {
                "agent_name": agent_name,
                "method": method_name,
                "error": str(e),
                "status": "failed"
            }

    async def _fallback_analysis(self, query: str) -> Dict[str, Any]:
        """Fallback analysis when main analysis fails"""
        return {
            "status": "fallback",
            "query": query,
            "analysis": "Basic analysis due to system limitations",
            "confidence": 0.3,
            "consolidated_insights": [],
            "agents_used": [],
            "timestamp": time.time()
        }

    def _store_analysis_history(
        self, 
        query: str, 
        relevant_agents: Dict[str, Any], 
        consolidated: Dict[str, Any]
    ):
        """Store analysis in history with size management"""

        history_entry = {
            "query": query,
            "timestamp": time.time(),
            "agents_used": list(relevant_agents.keys()),
            "consolidated_insights": consolidated.get("consolidated_insights", []),
            "confidence": consolidated.get("overall_confidence", 0.0)
        }

        self.analysis_history.append(history_entry)

        # Keep only last 100 entries to manage memory
        if len(self.analysis_history) > 100:
            self.analysis_history = self.analysis_history[-100:]

    def get_analysis_summary(self) -> Dict[str, Any]:
        """Enhanced analysis summary with performance metrics"""
        if not self.analysis_history:
            return {"message": "No analysis history available"}

        recent_analyses = self.analysis_history[-10:]

        # Agent usage statistics
        agent_usage = {}
        confidence_scores = []

        for analysis in recent_analyses:
            for agent in analysis["agents_used"]:
                agent_usage[agent] = agent_usage.get(agent, 0) + 1

            if "confidence" in analysis:
                confidence_scores.append(analysis["confidence"])

        # Performance statistics
        performance_stats = self.performance_monitor.get_stats("domain_orchestration")

        return {
            "total_analyses": len(self.analysis_history),
            "recent_analyses_count": len(recent_analyses),
            "most_used_agents": sorted(agent_usage.items(), key=lambda x: x[1], reverse=True),
            "recent_queries": [a["query"][:50] + "..." for a in recent_analyses[-5:]],
            "average_confidence": sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.0,
            "performance_metrics": performance_stats,
            "cache_stats": {
                "cache_size": len(self.cache_manager._cache),
                "cache_capacity": self.cache_manager.cache_size
            },
            "agent_performance": {
                name: agent.get_performance_stats() 
                for name, agent in self.agents.items()
                if hasattr(agent, 'get_performance_stats')
            }
        }

    def get_system_health(self) -> Dict[str, Any]:
        """Get overall system health status"""
        try:
            # Check agent status
            agent_status = {}
            total_errors = 0

            for name, agent in self.agents.items():
                if hasattr(agent, 'get_performance_stats'):
                    stats = agent.get_performance_stats()
                    error_count = stats.get('error_count', 0)
                    agent_status[name] = {
                        "status": "healthy" if error_count < 5 else "degraded",
                        "error_count": error_count
                    }
                    total_errors += error_count
                else:
                    agent_status[name] = {"status": "unknown", "error_count": 0}

            # Overall health determination
            overall_health = "healthy"
            if total_errors > 20:
                overall_health = "critical"
            elif total_errors > 10:
                overall_health = "degraded"
            elif total_errors > 5:
                overall_health = "warning"

            return {
                "overall_health": overall_health,
                "total_errors": total_errors,
                "agent_status": agent_status,
                "initialized": self._initialized,
                "uptime": time.time() - getattr(self, '_start_time', time.time()),
                "memory_usage": {
                    "analysis_history_size": len(self.analysis_history),
                    "cache_size": len(self.cache_manager._cache)
                }
            }

        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                "overall_health": "critical",
                "error": str(e),
                "timestamp": time.time()
            }

# Define utility classes and functions

class PerformanceMonitor:
    """Track performance metrics for different operations"""
    def __init__(self):
        self.metrics = defaultdict(lambda: {"call_count": 0, "total_time": 0})

    @asynccontextmanager
    async def measure(self, operation: str):
        """Context manager to measure operation execution time"""
        start_time = time.time()
        try:
            yield
        finally:
            end_time = time.time()
            elapsed_time = end_time - start_time
            self.update_metric(operation, elapsed_time)

    def update_metric(self, operation: str, elapsed_time: float):
        """Update performance metrics"""
        self.metrics[operation]["call_count"] += 1
        self.metrics[operation]["total_time"] += elapsed_time

    def get_stats(self, operation: str) -> Dict[str, Any]:
        """Get performance statistics for an operation"""
        metric = self.metrics[operation]
        call_count = metric["call_count"]
        total_time = metric["total_time"]

        if call_count == 0:
            return {"call_count": 0, "total_time": 0, "average_time": 0}

        average_time = total_time / call_count
        return {
            "call_count": call_count,
            "total_time": total_time,
            "average_time": average_time
        }

class CachedAnalysisManager:
    """Manage caching of analysis results"""

    def __init__(self, cache_size: int = 1024):
        self.cache_size = cache_size
        self._cache = lru_cache(maxsize=cache_size)(self._cache_get)

    def get_cache_key(self, query: str, evidence_ids: List[str]) -> str:
        """Generate cache key"""
        key_data = f"{query}_{'_'.join(sorted(evidence_ids))}"
        return hashlib.md5(key_data.encode()).hexdigest()

    async def get_or_compute(self, cache_key: str, computer_func):
        """Get from cache or compute if not in cache"""
        try:
            return await self._cache(cache_key, computer_func)
        except Exception as e:
            logger.error(f"Cache operation failed: {e}")
            return await computer_func()

    async def _cache_get(self, cache_key: str, computer_func):
        """Internal cache get method"""
        logger.info(f"Cache miss for key: {cache_key[:20]}...")
        result = await computer_func()
        if isinstance(result, dict):
            result["metadata"] = result.get("metadata", {})
            result["metadata"]["cache_used"] = False
        return result

    def clear_cache(self):
        """Clear the cache"""
        self._cache.cache_clear()
        logger.info("Analysis cache cleared")

class RelevanceScorer:
    """Calculate relevance score based on keyword categories"""

    def calculate_relevance(self, query: str, keyword_categories: Dict[str, List[str]]) -> float:
        """Calculate relevance score with weighted categories"""
        query_lower = query.lower()
        total_score = 0.0
        max_score = 0.0

        # Define weights for each category
        category_weights = {
            "primary": 0.6,
            "secondary": 0.3,
            "contextual": 0.1
        }

        for category, keywords in keyword_categories.items():
            weight = category_weights.get(category, 0.0)
            max_score += weight

            # Count keyword matches in this category
            matches = sum(1 for keyword in keywords if keyword in query_lower)
            category_score = min(1.0, matches / len(keywords)) if keywords else 0.0
            total_score += weight * category_score

        # Normalize relevance score
        if max_score == 0:
            return 0.0

        return total_score / max_score

class ConfidenceCalculator:
    """Calculate confidence based on evidence characteristics"""

    def calculate_confidence(self, evidence_list: List) -> float:
        """Calculate overall confidence score"""
        if not evidence_list:
            return 0.5  # Default confidence

        # Aggregate credibility and consistency scores
        total_credibility = sum(getattr(ev, 'credibility_score', 0.5) for ev in evidence_list)
        total_consistency = self._assess_consistency(evidence_list)

        # Combine scores
        average_credibility = total_credibility / len(evidence_list)
        overall_confidence = 0.6 * average_credibility + 0.4 * total_consistency

        return min(0.95, overall_confidence)

    def _assess_consistency(self, evidence_list: List) -> float:
        """Assess consistency among evidence"""
        sources = [getattr(ev, 'source', 'unknown') for ev in evidence_list]
        unique_sources = set(sources)
        consistency_score = len(unique_sources) / len(evidence_list)

        return consistency_score

# Domain Agent implementations

# Import configuration and reasoning engine
try:
    from domain_config import domain_config
    CONFIG_AVAILABLE = True
except ImportError:
    CONFIG_AVAILABLE = False
    domain_config = None

try:
    from reasoning_engine import reasoning_engine, Evidence, EvidenceType
    ADVANCED_REASONING_AVAILABLE = True
except ImportError:
    ADVANCED_REASONING_AVAILABLE = False

class MarketAnalystAgent(BaseDomainAgent):
    """Example Agent"""
    def __init__(self):
        super().__init__("Market Analysis")
        self.specialized_keywords = ["Market", "sentiment", "volume"]

    async def analyze_query(self, query: str) -> Dict[str, Any]:
        """Market Analysis"""
        return {}

    async def process_evidence(self, evidence: List) -> List[DomainInsight]:
        """Market process evidence"""
        return []

class RiskAnalystAgent(BaseDomainAgent):
    """Example Agent"""
    def __init__(self):
        super().__init__("Risk Analysis")
        self.specialized_keywords = ["Risk", "volatility", "hedge"]

    async def analyze_query(self, query: str) -> Dict[str, Any]:
        """Risk Analysis"""
        return {}

    async def process_evidence(self, evidence: List) -> List[DomainInsight]:
        """Risk process evidence"""
        return []