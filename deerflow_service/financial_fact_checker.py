
"""
Optimized Financial Data Validation Agent for DeerFlow

This agent implements advanced financial fact checking with:
- Enhanced NLP-based fact extraction using spaCy
- Multi-source API integration with intelligent fallbacks
- Fuzzy matching and temporal awareness
- Comprehensive caching and performance optimization
- Detailed validation reporting
"""

import asyncio
import json
import logging
import re
import time
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union, Tuple
from dataclasses import dataclass, field
from enum import Enum
from abc import ABC, abstractmethod
from functools import lru_cache
import aiohttp
import backoff
from fuzzywuzzy import fuzz
import numpy as np

try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False

logger = logging.getLogger("financial_fact_checker")

class FactType(Enum):
    INTEREST_RATE = "interest_rate"
    INFLATION = "inflation"
    UNEMPLOYMENT = "unemployment"
    GDP = "gdp"
    COMMODITY_PRICE = "commodity_price"
    EXCHANGE_RATE = "exchange_rate"
    STOCK_PRICE = "stock_price"
    BOND_YIELD = "bond_yield"
    ECONOMIC_INDICATOR = "economic_indicator"

@dataclass
class ExtractedFact:
    """Enhanced fact extraction with context"""
    text: str
    fact_type: FactType
    value: float
    unit: Optional[str]
    entity: Optional[str]
    context: str
    confidence: float
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class FactValidationResult:
    """Result of fact validation process"""
    fact: str
    is_valid: bool
    confidence: float
    official_value: Optional[str]
    source: str
    last_updated: str
    discrepancy: Optional[str]
    recommendation: str

class AdvancedFactExtractor:
    """Advanced fact extraction using NLP and pattern matching"""
    
    def __init__(self):
        # Initialize spaCy if available
        self.nlp = None
        if SPACY_AVAILABLE:
            try:
                self.nlp = spacy.load("en_core_web_sm")
            except OSError:
                logger.warning("spaCy model not found, using regex-only extraction")
        
        # Enhanced patterns with named groups
        self.patterns = {
            FactType.INTEREST_RATE: [
                r"(?P<entity>Fed|federal reserve|ECB|BOE|BOJ|central bank)\s*(?:policy\s*)?rate[s]?\s*(?:is|are|at|stands at|remains at)?\s*(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>%|percent|bps|basis points)",
                r"(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>%|percent|bps|basis points)\s*(?P<entity>Fed|federal|policy|interest)\s*rate",
                r"(?P<entity>interest|policy|discount|overnight)\s*rate[s]?\s*(?:of|at|is)\s*(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>%|percent)"
            ],
            FactType.INFLATION: [
                r"(?P<entity>CPI|inflation|consumer price index)\s*(?:rate|index)?\s*(?:is|at|stands at|rose to|fell to)?\s*(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>%|percent)",
                r"(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>%|percent)\s*(?P<entity>inflation|CPI)",
                r"(?P<entity>inflation)\s*(?:rate)?\s*(?:of|at|is)\s*(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>%|percent)\s*(?:YoY|year-over-year|annually)?"
            ],
            FactType.COMMODITY_PRICE: [
                r"(?P<entity>gold|silver|oil|crude|WTI|Brent|bitcoin|BTC|ethereum|ETH)\s*(?:price|trading|at|is)?\s*\$?(?P<value>\d+(?:,\d{3})*(?:\.\d+)?)\s*(?P<unit>per ounce|per barrel|each|USD)?",
                r"\$(?P<value>\d+(?:,\d{3})*(?:\.\d+)?)\s*(?P<unit>per ounce|per barrel|each)?\s*(?P<entity>gold|silver|oil|bitcoin)",
                r"(?P<entity>gold|silver|oil|bitcoin)\s*(?:is\s*)?trading\s*(?:at|around)\s*\$?(?P<value>\d+(?:,\d{3})*(?:\.\d+)?)"
            ],
            FactType.GDP: [
                r"(?P<entity>GDP|gross domestic product)\s*(?:growth|rate)?\s*(?:is|at|of)?\s*(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>%|percent)",
                r"(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>%|percent)\s*(?P<entity>GDP|economic)\s*growth",
                r"economy\s*(?:grew|expanded|contracted)\s*(?:by\s*)?(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>%|percent)"
            ],
            FactType.UNEMPLOYMENT: [
                r"(?P<entity>unemployment|jobless)\s*(?:rate)?\s*(?:is|at|stands at)?\s*(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>%|percent)",
                r"(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>%|percent)\s*(?P<entity>unemployment|jobless)",
                r"unemployment\s*(?:rate)?\s*(?:of|at|is)\s*(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>%|percent)"
            ]
        }
        
        # Entity to fact type mapping
        self.entity_mapping = {
            "fed": FactType.INTEREST_RATE,
            "federal reserve": FactType.INTEREST_RATE,
            "ecb": FactType.INTEREST_RATE,
            "cpi": FactType.INFLATION,
            "inflation": FactType.INFLATION,
            "gdp": FactType.GDP,
            "unemployment": FactType.UNEMPLOYMENT,
            "gold": FactType.COMMODITY_PRICE,
            "oil": FactType.COMMODITY_PRICE,
            "bitcoin": FactType.COMMODITY_PRICE
        }
    
    def extract_facts(self, text: str) -> List[ExtractedFact]:
        """Extract financial facts with enhanced context understanding"""
        facts = []
        
        if self.nlp:
            # Use spaCy for sentence segmentation and NER
            doc = self.nlp(text)
            for sent in doc.sents:
                sent_text = sent.text.strip()
                facts.extend(self._extract_from_sentence(sent_text, text))
                # Use NLP for additional extraction
                facts.extend(self._extract_with_nlp(sent, text))
        else:
            # Fallback to simple sentence splitting
            sentences = [s.strip() for s in text.split('.') if s.strip()]
            for sent in sentences:
                facts.extend(self._extract_from_sentence(sent, text))
        
        # Deduplicate and rank facts
        return self._deduplicate_facts(facts)
    
    def _extract_from_sentence(self, sentence: str, full_text: str) -> List[ExtractedFact]:
        """Extract facts from a sentence using pattern matching"""
        facts = []
        
        for fact_type, patterns in self.patterns.items():
            for pattern in patterns:
                matches = re.finditer(pattern, sentence, re.IGNORECASE)
                for match in matches:
                    fact = self._create_fact_from_match(
                        match, fact_type, sentence, full_text
                    )
                    if fact:
                        facts.append(fact)
        
        return facts
    
    def _create_fact_from_match(
        self, 
        match: re.Match, 
        fact_type: FactType, 
        sentence: str,
        full_text: str
    ) -> Optional[ExtractedFact]:
        """Create fact from regex match"""
        try:
            groups = match.groupdict()
            
            # Extract value
            value_str = groups.get('value', '').replace(',', '')
            if not value_str:
                return None
            
            value = float(value_str)
            
            # Extract unit
            unit = groups.get('unit', '')
            if unit == 'bps' or unit == 'basis points':
                value = value / 100  # Convert basis points to percentage
                unit = '%'
            
            # Extract entity
            entity = groups.get('entity', '')
            
            # Calculate confidence based on pattern specificity
            confidence = 0.9 if all(groups.values()) else 0.7
            
            # Get broader context
            context_start = max(0, match.start() - 50)
            context_end = min(len(sentence), match.end() + 50)
            context = sentence[context_start:context_end]
            
            return ExtractedFact(
                text=match.group(0),
                fact_type=fact_type,
                value=value,
                unit=unit,
                entity=entity,
                context=context,
                confidence=confidence,
                metadata={
                    "sentence": sentence,
                    "position": match.span()
                }
            )
            
        except Exception as e:
            logger.error(f"Error creating fact from match: {e}")
            return None
    
    def _extract_with_nlp(self, sent, full_text: str) -> List[ExtractedFact]:
        """Extract facts using NLP analysis"""
        facts = []
        
        if not self.nlp:
            return facts
        
        # Look for money entities
        for ent in sent.ents:
            if ent.label_ == "MONEY":
                # Try to determine what this money value represents
                fact_type = self._determine_fact_type_from_context(ent, sent)
                if fact_type:
                    value = self._parse_money_value(ent.text)
                    if value:
                        facts.append(ExtractedFact(
                            text=ent.text,
                            fact_type=fact_type,
                            value=value,
                            unit="USD",
                            entity=self._find_related_entity(ent, sent),
                            context=sent.text,
                            confidence=0.6,
                            metadata={"nlp_extracted": True}
                        ))
            
            elif ent.label_ == "PERCENT":
                # Handle percentage entities
                fact_type = self._determine_fact_type_from_context(ent, sent)
                if fact_type:
                    value = self._parse_percentage_value(ent.text)
                    if value:
                        facts.append(ExtractedFact(
                            text=ent.text,
                            fact_type=fact_type,
                            value=value,
                            unit="%",
                            entity=self._find_related_entity(ent, sent),
                            context=sent.text,
                            confidence=0.6,
                            metadata={"nlp_extracted": True}
                        ))
        
        return facts
    
    def _determine_fact_type_from_context(self, entity, sentence) -> Optional[FactType]:
        """Determine fact type from surrounding context"""
        context_words = [token.text.lower() for token in sentence]
        
        # Check for keywords
        for keyword, fact_type in self.entity_mapping.items():
            if keyword in ' '.join(context_words):
                return fact_type
        
        return None
    
    def _parse_money_value(self, text: str) -> Optional[float]:
        """Parse money value from text"""
        try:
            # Remove currency symbols and commas
            cleaned = re.sub(r'[$,]', '', text)
            return float(cleaned)
        except:
            return None
    
    def _parse_percentage_value(self, text: str) -> Optional[float]:
        """Parse percentage value from text"""
        try:
            # Remove % symbol
            cleaned = text.replace('%', '').strip()
            return float(cleaned)
        except:
            return None
    
    def _find_related_entity(self, value_entity, sentence) -> str:
        """Find related entity near the value"""
        # Look for nearby proper nouns or specific keywords
        for token in sentence:
            if hasattr(token, 'pos_') and token.pos_ == "PROPN" and abs(token.i - value_entity.start) < 5:
                return token.text
        
        return ""
    
    def _deduplicate_facts(self, facts: List[ExtractedFact]) -> List[ExtractedFact]:
        """Remove duplicate facts and keep highest confidence ones"""
        unique_facts = {}
        
        for fact in facts:
            key = (fact.fact_type, fact.value, fact.entity)
            if key not in unique_facts or fact.confidence > unique_facts[key].confidence:
                unique_facts[key] = fact
        
        return list(unique_facts.values())

# Data Source Abstractions
class DataSource(ABC):
    """Abstract base class for data sources"""
    
    @abstractmethod
    async def get_data(self, indicator: str) -> Optional[Dict[str, Any]]:
        """Get data for a specific indicator"""
        pass
    
    @abstractmethod
    def get_priority(self) -> int:
        """Get source priority (lower is higher priority)"""
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """Check if source is available"""
        pass

class FREDDataSource(DataSource):
    """Federal Reserve Economic Data API"""
    
    def __init__(self, api_key: str, session: aiohttp.ClientSession):
        self.api_key = api_key
        self.session = session
        self.base_url = "https://api.stlouisfed.org/fred"
        self.series_mapping = {
            "fed_rate": "FEDFUNDS",
            "inflation": "CPIAUCSL",
            "unemployment": "UNRATE",
            "gdp": "GDP",
            "10y_yield": "DGS10"
        }
        self.available = True
    
    @backoff.on_exception(
        backoff.expo,
        aiohttp.ClientError,
        max_tries=3,
        max_time=10
    )
    async def get_data(self, indicator: str) -> Optional[Dict[str, Any]]:
        """Get data from FRED API"""
        series_id = self.series_mapping.get(indicator)
        if not series_id:
            return None
        
        try:
            url = f"{self.base_url}/series/observations"
            params = {
                "series_id": series_id,
                "api_key": self.api_key,
                "file_type": "json",
                "limit": 1,
                "sort_order": "desc"
            }
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get("observations"):
                        obs = data["observations"][0]
                        return {
                            "value": float(obs["value"]),
                            "date": obs["date"],
                            "source": "FRED",
                            "series_id": series_id
                        }
                else:
                    self.available = False
                    
        except Exception as e:
            logger.error(f"FRED API error: {e}")
            self.available = False
        
        return None
    
    def get_priority(self) -> int:
        return 1  # Highest priority
    
    def is_available(self) -> bool:
        return self.available

class YahooFinanceSource(DataSource):
    """Yahoo Finance API for market data"""
    
    def __init__(self, session: aiohttp.ClientSession):
        self.session = session
        self.base_url = "https://query1.finance.yahoo.com/v8/finance/chart"
        self.symbol_mapping = {
            "gold": "GC=F",
            "silver": "SI=F",
            "oil": "CL=F",
            "bitcoin": "BTC-USD",
            "sp500": "^GSPC",
            "nasdaq": "^IXIC",
            "dow": "^DJI"
        }
        self.available = True
    
    async def get_data(self, indicator: str) -> Optional[Dict[str, Any]]:
        """Get data from Yahoo Finance"""
        symbol = self.symbol_mapping.get(indicator)
        if not symbol:
            return None
        
        try:
            url = f"{self.base_url}/{symbol}"
            async with self.session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    result = data.get("chart", {}).get("result", [])
                    if result:
                        meta = result[0].get("meta", {})
                        return {
                            "value": meta.get("regularMarketPrice"),
                            "date": datetime.fromtimestamp(
                                meta.get("regularMarketTime", 0)
                            ).isoformat(),
                            "source": "Yahoo Finance",
                            "symbol": symbol
                        }
                else:
                    self.available = False
                    
        except Exception as e:
            logger.error(f"Yahoo Finance error: {e}")
            self.available = False
        
        return None
    
    def get_priority(self) -> int:
        return 2
    
    def is_available(self) -> bool:
        return self.available

class DataSourceManager:
    """Manages multiple data sources with fallback"""
    
    def __init__(self, session: aiohttp.ClientSession):
        self.session = session
        self.sources: List[DataSource] = []
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.cache_ttl = 300  # 5 minutes
    
    def add_source(self, source: DataSource):
        """Add a data source"""
        self.sources.append(source)
        # Sort by priority
        self.sources.sort(key=lambda s: s.get_priority())
    
    async def get_indicator_data(
        self, 
        indicator: str, 
        use_cache: bool = True
    ) -> Optional[Dict[str, Any]]:
        """Get indicator data with fallback"""
        
        # Check cache first
        if use_cache and indicator in self.cache:
            cached = self.cache[indicator]
            if datetime.now() - cached["cached_at"] < timedelta(seconds=self.cache_ttl):
                return cached["data"]
        
        # Try each source in priority order
        for source in self.sources:
            if source.is_available():
                try:
                    data = await source.get_data(indicator)
                    if data:
                        # Cache the result
                        self.cache[indicator] = {
                            "data": data,
                            "cached_at": datetime.now()
                        }
                        return data
                except Exception as e:
                    logger.error(f"Error getting data from {source.__class__.__name__}: {e}")
        
        return None
    
    def get_available_sources(self) -> List[str]:
        """Get list of available sources"""
        return [
            source.__class__.__name__ 
            for source in self.sources 
            if source.is_available()
        ]

class IntelligentValidator:
    """Intelligent validation with fuzzy matching and temporal awareness"""
    
    def __init__(self):
        self.tolerance_config = {
            FactType.INTEREST_RATE: {
                "absolute": 0.25,  # 0.25% absolute difference
                "relative": 0.05   # 5% relative difference
            },
            FactType.COMMODITY_PRICE: {
                "absolute": None,
                "relative": 0.03   # 3% relative difference
            },
            FactType.INFLATION: {
                "absolute": 0.2,
                "relative": 0.1
            },
            FactType.UNEMPLOYMENT: {
                "absolute": 0.2,
                "relative": 0.1
            },
            FactType.GDP: {
                "absolute": 0.5,
                "relative": 0.15
            }
        }
        
        # Time decay factors for data freshness
        self.freshness_decay = {
            "hours": 0.99,    # 1% decay per hour
            "days": 0.95,     # 5% decay per day
            "weeks": 0.80     # 20% decay per week
        }
    
    def validate_fact(
        self, 
        fact: ExtractedFact, 
        official_data: Dict[str, Any]
    ) -> FactValidationResult:
        """Validate fact with intelligent comparison"""
        
        # Calculate value difference
        claimed_value = fact.value
        official_value = official_data.get("value")
        
        if official_value is None:
            return self._create_unverifiable_result(fact)
        
        # Check if values are within tolerance
        is_valid, confidence = self._check_tolerance(
            claimed_value, 
            official_value, 
            fact.fact_type
        )
        
        # Adjust confidence based on data freshness
        data_date = self._parse_date(official_data.get("date"))
        if data_date:
            freshness_factor = self._calculate_freshness(data_date)
            confidence *= freshness_factor
        
        # Consider context and entity matching
        if fact.entity:
            entity_match = self._check_entity_match(
                fact.entity, 
                official_data.get("source", "")
            )
            confidence *= entity_match
        
        # Create detailed result
        return FactValidationResult(
            fact=fact.text,
            is_valid=is_valid,
            confidence=confidence,
            official_value=self._format_value(official_value, fact.unit),
            source=official_data.get("source", "Unknown"),
            last_updated=official_data.get("date", "Unknown"),
            discrepancy=self._calculate_discrepancy(
                claimed_value, 
                official_value, 
                fact.unit
            ) if not is_valid else None,
            recommendation=self._generate_recommendation(
                is_valid, 
                confidence, 
                fact.fact_type
            )
        )
    
    def _check_tolerance(
        self, 
        claimed: float, 
        official: float, 
        fact_type: FactType
    ) -> Tuple[bool, float]:
        """Check if values are within acceptable tolerance"""
        
        config = self.tolerance_config.get(fact_type, {})
        
        # Absolute difference
        abs_diff = abs(claimed - official)
        
        # Relative difference
        rel_diff = abs_diff / official if official != 0 else float('inf')
        
        # Check absolute tolerance
        if config.get("absolute") is not None:
            if abs_diff <= config["absolute"]:
                return True, 0.95
        
        # Check relative tolerance
        if config.get("relative") is not None:
            if rel_diff <= config["relative"]:
                return True, 0.90
        
        # Calculate confidence based on how close the values are
        if rel_diff < 0.1:  # Within 10%
            confidence = 0.7 - (rel_diff * 5)  # Linear decay
        elif rel_diff < 0.2:  # Within 20%
            confidence = 0.5 - ((rel_diff - 0.1) * 3)
        else:
            confidence = 0.1
        
        return False, confidence
    
    def _calculate_freshness(self, data_date: datetime) -> float:
        """Calculate freshness factor based on data age"""
        now = datetime.now()
        age = now - data_date
        
        if age < timedelta(hours=1):
            return 1.0
        elif age < timedelta(days=1):
            hours = age.total_seconds() / 3600
            return self.freshness_decay["hours"] ** hours
        elif age < timedelta(weeks=1):
            days = age.days
            return self.freshness_decay["days"] ** days
        else:
            weeks = age.days / 7
            return self.freshness_decay["weeks"] ** weeks
    
    def _check_entity_match(self, claimed_entity: str, source: str) -> float:
        """Check how well entities match"""
        # Use fuzzy matching
        ratio = fuzz.partial_ratio(
            claimed_entity.lower(), 
            source.lower()
        )
        return ratio / 100.0
    
    def _format_value(self, value: float, unit: str) -> str:
        """Format value with appropriate unit"""
        if unit == "%":
            return f"{value:.2f}%"
        elif unit == "USD" or "$" in str(unit):
            return f"${value:,.2f}"
        else:
            return f"{value:,.2f} {unit or ''}"
    
    def _calculate_discrepancy(
        self, 
        claimed: float, 
        official: float, 
        unit: str
    ) -> str:
        """Calculate and format discrepancy"""
        diff = claimed - official
        rel_diff = (diff / official * 100) if official != 0 else 0
        
        return (
            f"Claimed: {self._format_value(claimed, unit)}, "
            f"Official: {self._format_value(official, unit)} "
            f"({rel_diff:+.1f}% difference)"
        )
    
    def _generate_recommendation(
        self, 
        is_valid: bool, 
        confidence: float, 
        fact_type: FactType
    ) -> str:
        """Generate intelligent recommendation"""
        if is_valid and confidence > 0.8:
            return "Fact validated with high confidence"
        elif is_valid and confidence > 0.6:
            return "Fact validated but consider verifying with additional sources"
        elif confidence > 0.5:
            return "Minor discrepancy detected - verify with current data"
        else:
            return f"Significant discrepancy - update with official {fact_type.value} data"
    
    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """Parse date string to datetime"""
        if not date_str:
            return None
        
        try:
            # Try ISO format first
            return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        except:
            try:
                # Try common formats
                for fmt in ["%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%d/%m/%Y"]:
                    return datetime.strptime(date_str, fmt)
            except:
                return None
    
    def _create_unverifiable_result(self, fact: ExtractedFact) -> FactValidationResult:
        """Create result for facts that cannot be verified"""
        return FactValidationResult(
            fact=fact.text,
            is_valid=False,
            confidence=0.0,
            official_value=None,
            source="No data available",
            last_updated="N/A",
            discrepancy="Unable to verify - no official data found",
            recommendation="Manual verification required"
        )

class OptimizedFinancialFactChecker:
    """
    Optimized Financial Data Validation Agent with advanced features:
    - Multi-source API integration with fallbacks
    - Intelligent NLP-based fact extraction
    - Fuzzy matching and temporal awareness
    - Comprehensive caching and performance optimization
    - Detailed validation reporting
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.session: Optional[aiohttp.ClientSession] = None
        
        # Initialize components
        self.fact_extractor = AdvancedFactExtractor()
        self.validator = IntelligentValidator()
        self.data_sources: Optional[DataSourceManager] = None
        
        # Caching
        self.validation_cache: Dict[str, FactValidationResult] = {}
        self.cache_ttl = self.config.get("cache_ttl", 300)  # 5 minutes
        
        # Metrics
        self.metrics = {
            "total_validations": 0,
            "successful_validations": 0,
            "failed_validations": 0,
            "cache_hits": 0,
            "api_calls": 0
        }
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession()
        
        # Initialize data sources
        self.data_sources = DataSourceManager(self.session)
        
        # Add configured sources
        if self.config.get("fred_api_key"):
            self.data_sources.add_source(
                FREDDataSource(self.config["fred_api_key"], self.session)
            )
        
        self.data_sources.add_source(
            YahooFinanceSource(self.session)
        )
        
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    async def validate_financial_facts(
        self, 
        research_content: str,
        options: Dict[str, Any] = None
    ) -> List[FactValidationResult]:
        """
        Validate financial facts with advanced features
        
        Args:
            research_content: Text containing financial facts
            options: Validation options (use_cache, parallel, etc.)
        
        Returns:
            List of validation results
        """
        options = options or {}
        use_cache = options.get("use_cache", True)
        parallel = options.get("parallel", True)
        
        self.metrics["total_validations"] += 1
        
        try:
            # Extract facts using NLP
            facts = self.fact_extractor.extract_facts(research_content)
            logger.info(f"Extracted {len(facts)} financial facts")
            
            # Validate facts
            if parallel:
                results = await self._validate_facts_parallel(facts, use_cache)
            else:
                results = await self._validate_facts_sequential(facts, use_cache)
            
            self.metrics["successful_validations"] += 1
            return results
            
        except Exception as e:
            logger.error(f"Validation failed: {e}")
            self.metrics["failed_validations"] += 1
            raise
    
    async def _validate_facts_parallel(
        self, 
        facts: List[ExtractedFact],
        use_cache: bool
    ) -> List[FactValidationResult]:
        """Validate facts in parallel"""
        tasks = [
            self._validate_single_fact(fact, use_cache) 
            for fact in facts
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out exceptions
        valid_results = []
        for result in results:
            if isinstance(result, FactValidationResult):
                valid_results.append(result)
            elif isinstance(result, Exception):
                logger.error(f"Validation error: {result}")
        
        return valid_results
    
    async def _validate_facts_sequential(
        self, 
        facts: List[ExtractedFact],
        use_cache: bool
    ) -> List[FactValidationResult]:
        """Validate facts sequentially"""
        results = []
        
        for fact in facts:
            try:
                result = await self._validate_single_fact(fact, use_cache)
                results.append(result)
            except Exception as e:
                logger.error(f"Error validating fact: {e}")
                results.append(self._create_error_result(fact, str(e)))
        
        return results
    
    async def _validate_single_fact(
        self, 
        fact: ExtractedFact,
        use_cache: bool
    ) -> FactValidationResult:
        """Validate a single fact"""
        
        # Check cache first
        cache_key = self._get_cache_key(fact)
        if use_cache and cache_key in self.validation_cache:
            cached_result = self.validation_cache[cache_key]
            if self._is_cache_valid(cached_result):
                self.metrics["cache_hits"] += 1
                return cached_result
        
        # Map fact type to indicator
        indicator = self._map_fact_to_indicator(fact)
        if not indicator:
            return self._create_unverifiable_result(fact)
        
        # Get official data from sources
        self.metrics["api_calls"] += 1
        official_data = await self.data_sources.get_indicator_data(
            indicator, 
            use_cache=use_cache
        )
        
        if not official_data:
            return self._create_unverifiable_result(fact)
        
        # Validate using intelligent validator
        result = self.validator.validate_fact(fact, official_data)
        
        # Cache the result
        if use_cache:
            self.validation_cache[cache_key] = result
        
        return result
    
    def _map_fact_to_indicator(self, fact: ExtractedFact) -> Optional[str]:
        """Map fact type to data source indicator"""
        mapping = {
            FactType.INTEREST_RATE: "fed_rate",
            FactType.INFLATION: "inflation",
            FactType.UNEMPLOYMENT: "unemployment",
            FactType.GDP: "gdp",
            FactType.COMMODITY_PRICE: fact.entity.lower() if fact.entity else None
        }
        
        return mapping.get(fact.fact_type)
    
    def _get_cache_key(self, fact: ExtractedFact) -> str:
        """Generate cache key for fact"""
        return f"{fact.fact_type.value}:{fact.value}:{fact.entity or 'none'}"
    
    def _is_cache_valid(self, result: FactValidationResult) -> bool:
        """Check if cached result is still valid"""
        try:
            # Parse last updated time
            last_updated = datetime.fromisoformat(result.last_updated)
            age = datetime.now() - last_updated
            
            # Cache validity depends on fact type
            max_age_minutes = {
                "commodity_price": 5,    # 5 minutes for volatile prices
                "interest_rate": 60,     # 1 hour for policy rates
                "inflation": 1440,       # 1 day for inflation data
                "unemployment": 1440,    # 1 day for unemployment
                "gdp": 10080           # 1 week for GDP
            }
            
            # Default to 30 minutes
            max_age = max_age_minutes.get(result.fact.split(':')[0], 30)
            
            return age.total_seconds() < (max_age * 60)
            
        except:
            return False
    
    def _create_unverifiable_result(self, fact: ExtractedFact) -> FactValidationResult:
        """Create result for unverifiable facts"""
        return FactValidationResult(
            fact=fact.text,
            is_valid=False,
            confidence=0.0,
            official_value=None,
            source="Unable to verify",
            last_updated=datetime.now().isoformat(),
            discrepancy="No official data source available",
            recommendation="Manual verification required"
        )
    
    def _create_error_result(self, fact: ExtractedFact, error: str) -> FactValidationResult:
        """Create result for validation errors"""
        return FactValidationResult(
            fact=fact.text,
            is_valid=False,
            confidence=0.0,
            official_value=None,
            source="Error",
            last_updated=datetime.now().isoformat(),
            discrepancy=f"Validation error: {error}",
            recommendation="Retry validation or verify manually"
        )
    
    def generate_validation_report(
        self, 
        results: List[FactValidationResult],
        format: str = "markdown"
    ) -> str:
        """Generate comprehensive validation report"""
        
        if format == "markdown":
            return self._generate_markdown_report(results)
        elif format == "json":
            return self._generate_json_report(results)
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    def _generate_markdown_report(self, results: List[FactValidationResult]) -> str:
        """Generate Markdown validation report"""
        total = len(results)
        valid = sum(1 for r in results if r.is_valid)
        high_confidence = sum(1 for r in results if r.confidence > 0.8)
        
        # Group results by validation status
        valid_facts = [r for r in results if r.is_valid and r.confidence > 0.8]
        questionable_facts = [r for r in results if r.is_valid and r.confidence <= 0.8]
        invalid_facts = [r for r in results if not r.is_valid]
        
        available_sources = self.data_sources.get_available_sources() if self.data_sources else []
        
        report = f"""# Financial Data Validation Report

## Executive Summary

- **Total Facts Checked**: {total}
- **Valid Facts**: {valid} ({valid/total*100:.1f}% if total > 0 else 0)
- **High Confidence Facts**: {high_confidence} ({high_confidence/total*100:.1f}% if total > 0 else 0)
- **Data Sources Available**: {', '.join(available_sources)}
- **Report Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}

## Validation Results

### ✅ Validated Facts (High Confidence)
"""
        
        for result in valid_facts:
            report += f"""
**Fact**: {result.fact}
- **Confidence**: {result.confidence:.1%}
- **Official Value**: {result.official_value}
- **Source**: {result.source}
- **Last Updated**: {result.last_updated}
"""
        
        if questionable_facts:
            report += "\n### ⚠️ Validated Facts (Low Confidence)\n"
            for result in questionable_facts:
                report += f"""
**Fact**: {result.fact}
- **Confidence**: {result.confidence:.1%}
- **Official Value**: {result.official_value}
- **Recommendation**: {result.recommendation}
"""
        
        if invalid_facts:
            report += "\n### ❌ Invalid or Unverifiable Facts\n"
            for result in invalid_facts:
                report += f"""
**Fact**: {result.fact}
- **Issue**: {result.discrepancy}
- **Recommendation**: {result.recommendation}
"""
        
        # Add metrics
        cache_hit_rate = (self.metrics['cache_hits']/max(1,self.metrics['api_calls'])*100) if self.metrics['api_calls'] > 0 else 0
        avg_confidence = (sum(r.confidence for r in results)/max(1,total)) if total > 0 else 0
        
        report += f"""
## Validation Metrics

- **Cache Hit Rate**: {self.metrics['cache_hits']}/{self.metrics['api_calls']} ({cache_hit_rate:.1f}%)
- **API Calls Made**: {self.metrics['api_calls']}
- **Average Confidence**: {avg_confidence:.1%}

## Recommendations

1. **High Priority**: Address all invalid facts immediately
2. **Medium Priority**: Verify low-confidence validated facts
3. **Low Priority**: Consider updating cache settings for frequently validated facts

---
*This report uses official government and financial data sources. For trading decisions, always verify with real-time market data.*
"""
        
        return report
    
    def _generate_json_report(self, results: List[FactValidationResult]) -> str:
        """Generate JSON validation report"""
        available_sources = self.data_sources.get_available_sources() if self.data_sources else []
        
        report_data = {
            "metadata": {
                "total_facts": len(results),
                "valid_facts": sum(1 for r in results if r.is_valid),
                "timestamp": datetime.now().isoformat(),
                "data_sources": available_sources
            },
            "results": [
                {
                    "fact": r.fact,
                    "is_valid": r.is_valid,
                    "confidence": r.confidence,
                    "official_value": r.official_value,
                    "source": r.source,
                    "last_updated": r.last_updated,
                    "discrepancy": r.discrepancy,
                    "recommendation": r.recommendation
                }
                for r in results
            ],
            "metrics": self.metrics
        }
        
        return json.dumps(report_data, indent=2)
    
    def get_validation_statistics(self) -> Dict[str, Any]:
        """Get validation statistics"""
        available_sources = self.data_sources.get_available_sources() if self.data_sources else []
        
        return {
            "metrics": self.metrics,
            "cache_size": len(self.validation_cache),
            "available_sources": available_sources,
            "uptime": "Active" if self.session and not self.session.closed else "Inactive"
        }

# Global instance for use across the application
optimized_fact_checker = OptimizedFinancialFactChecker()

# Legacy compatibility
financial_fact_checker = optimized_fact_checker
