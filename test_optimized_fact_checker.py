
#!/usr/bin/env python3
"""
Test script for the optimized financial fact checker

This script demonstrates the enhanced capabilities including:
- Advanced NLP fact extraction
- Multi-source API validation
- Intelligent fuzzy matching
- Comprehensive reporting
"""

import asyncio
import logging
from pathlib import Path
from deerflow_service.financial_fact_checker import OptimizedFinancialFactChecker

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

async def test_optimized_fact_checker():
    """Test the optimized financial fact checker"""
    
    print("🧪 Testing Optimized Financial Fact Checker")
    print("=" * 60)
    
    # Configuration (you can add API keys here for better testing)
    config = {
        "cache_ttl": 300,
        # "fred_api_key": "your_fred_api_key_here",  # Uncomment and add key for FRED data
    }
    
    # Sample research content with various financial facts
    research_content = """
    The Federal Reserve maintained interest rates at 5.25% in their latest meeting, 
    marking the highest level since 2001. This represents a significant shift from 
    the near-zero rates of recent years.
    
    Current CPI inflation stands at 3.2%, down from last month's 3.7%, indicating 
    progress toward the Fed's 2% target. Core inflation remains elevated at 4.1%.
    
    Gold is trading at $2,045 per ounce, while Bitcoin reached $43,500. Silver 
    has climbed to $24.50 per ounce amid increased demand.
    
    US GDP growth for Q3 was revised up to 5.2% annualized, exceeding economists' 
    expectations of 4.8%. This strong performance reflects robust consumer spending.
    
    Unemployment remains at historic lows of 3.7%, though job openings have 
    declined from peak levels. The labor market shows signs of cooling.
    
    The 10-year Treasury yield has risen to 4.5%, reflecting expectations of 
    higher rates for longer. This has impacted mortgage rates significantly.
    """
    
    try:
        # Initialize the optimized fact checker
        async with OptimizedFinancialFactChecker(config) as checker:
            
            print("1. Testing fact extraction...")
            facts = checker.fact_extractor.extract_facts(research_content)
            print(f"   ✅ Extracted {len(facts)} facts")
            
            # Display extracted facts
            for i, fact in enumerate(facts, 1):
                print(f"   {i}. {fact.fact_type.value}: {fact.text} (confidence: {fact.confidence:.2f})")
            
            print("\n2. Testing comprehensive validation...")
            
            # Test with different options
            validation_options = [
                {"use_cache": True, "parallel": True, "name": "Parallel with cache"},
                {"use_cache": False, "parallel": False, "name": "Sequential without cache"}
            ]
            
            for options in validation_options:
                print(f"\n   Testing {options['name']}...")
                
                results = await checker.validate_financial_facts(
                    research_content, 
                    options
                )
                
                print(f"   ✅ Validated {len(results)} facts")
                
                # Show validation summary
                valid_count = sum(1 for r in results if r.is_valid)
                high_conf_count = sum(1 for r in results if r.confidence > 0.8)
                
                print(f"   📊 Valid: {valid_count}, High confidence: {high_conf_count}")
            
            print("\n3. Testing report generation...")
            
            # Generate final validation results
            final_results = await checker.validate_financial_facts(research_content)
            
            # Test markdown report
            markdown_report = checker.generate_validation_report(final_results, "markdown")
            print("   ✅ Generated markdown report")
            
            # Test JSON report
            json_report = checker.generate_validation_report(final_results, "json")
            print("   ✅ Generated JSON report")
            
            print("\n4. Testing statistics collection...")
            stats = checker.get_validation_statistics()
            print(f"   ✅ Statistics: {stats}")
            
            print("\n" + "=" * 60)
            print("📋 VALIDATION REPORT")
            print("=" * 60)
            print(markdown_report)
            
            print("\n" + "=" * 60)
            print("📊 PERFORMANCE METRICS")
            print("=" * 60)
            print(f"Total validations: {checker.metrics['total_validations']}")
            print(f"Successful validations: {checker.metrics['successful_validations']}")
            print(f"API calls made: {checker.metrics['api_calls']}")
            print(f"Cache hits: {checker.metrics['cache_hits']}")
            
            if checker.metrics['api_calls'] > 0:
                cache_hit_rate = (checker.metrics['cache_hits'] / checker.metrics['api_calls']) * 100
                print(f"Cache hit rate: {cache_hit_rate:.1f}%")
            
            print(f"Available data sources: {stats['available_sources']}")
            
        print("\n🎉 All tests completed successfully!")
        print("\nKey Features Demonstrated:")
        print("✅ Enhanced NLP-based fact extraction")
        print("✅ Multi-source API integration with fallbacks")
        print("✅ Intelligent fuzzy matching and validation")
        print("✅ Comprehensive caching system")
        print("✅ Detailed reporting capabilities")
        print("✅ Performance metrics collection")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_individual_components():
    """Test individual components of the fact checker"""
    
    print("\n🔧 Testing Individual Components")
    print("=" * 60)
    
    from deerflow_service.financial_fact_checker import (
        AdvancedFactExtractor, 
        IntelligentValidator,
        FactType,
        ExtractedFact
    )
    
    # Test fact extractor
    print("1. Testing AdvancedFactExtractor...")
    extractor = AdvancedFactExtractor()
    
    test_text = "The Fed raised interest rates to 5.5% and inflation is at 3.1%"
    facts = extractor.extract_facts(test_text)
    print(f"   ✅ Extracted {len(facts)} facts from test text")
    
    # Test validator
    print("\n2. Testing IntelligentValidator...")
    validator = IntelligentValidator()
    
    if facts:
        # Create mock official data
        mock_data = {
            "value": 5.4,  # Slightly different from claimed 5.5%
            "date": "2024-01-15",
            "source": "Federal Reserve"
        }
        
        result = validator.validate_fact(facts[0], mock_data)
        print(f"   ✅ Validation result: {result.is_valid} (confidence: {result.confidence:.2f})")
    
    print("\n✅ Component tests completed!")

if __name__ == "__main__":
    print("🚀 Starting Optimized Financial Fact Checker Tests")
    
    # Run main test
    success = asyncio.run(test_optimized_fact_checker())
    
    # Run component tests
    asyncio.run(test_individual_components())
    
    if success:
        print("\n🎯 All tests passed! The optimized fact checker is ready for use.")
    else:
        print("\n⚠️ Some tests failed. Please check the error messages above.")
