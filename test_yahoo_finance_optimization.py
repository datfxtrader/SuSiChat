
#!/usr/bin/env python3
"""
Test script for Yahoo Finance optimization features
"""

import asyncio
import time
import requests
import json
from typing import Dict, Any

class YahooFinanceOptimizationTester:
    def __init__(self, base_url: str = "http://localhost:5000"):
        self.base_url = base_url
        self.results = []
    
    def test_basic_bitcoin_price(self) -> Dict[str, Any]:
        """Test basic Bitcoin price fetching"""
        print("🧪 Testing basic Bitcoin price fetching...")
        
        start_time = time.time()
        try:
            response = requests.get(f"{self.base_url}/api/yahoo-finance/bitcoin/price", timeout=30)
            elapsed = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Bitcoin price: ${data['data']['currentPrice']:,.2f}")
                print(f"📊 Change: {data['data']['priceChangePercent24h']:+.2f}%")
                print(f"⏱️ Response time: {elapsed:.2f}s")
                print(f"💾 Cached: {data['performance']['cached']}")
                
                return {
                    "test": "basic_bitcoin_price",
                    "success": True,
                    "response_time": elapsed,
                    "cached": data['performance']['cached'],
                    "price": data['data']['currentPrice']
                }
            else:
                print(f"❌ Failed: HTTP {response.status_code}")
                return {"test": "basic_bitcoin_price", "success": False, "error": f"HTTP {response.status_code}"}
                
        except Exception as e:
            print(f"❌ Error: {e}")
            return {"test": "basic_bitcoin_price", "success": False, "error": str(e)}
    
    def test_cache_performance(self) -> Dict[str, Any]:
        """Test caching performance with multiple requests"""
        print("\n🧪 Testing cache performance...")
        
        times = []
        cached_responses = 0
        
        for i in range(5):
            start_time = time.time()
            try:
                response = requests.get(f"{self.base_url}/api/yahoo-finance/bitcoin/price", timeout=10)
                elapsed = time.time() - start_time
                times.append(elapsed)
                
                if response.status_code == 200:
                    data = response.json()
                    if data['performance']['cached']:
                        cached_responses += 1
                    print(f"Request {i+1}: {elapsed:.3f}s {'(cached)' if data['performance']['cached'] else '(fresh)'}")
                else:
                    print(f"Request {i+1}: Failed - HTTP {response.status_code}")
                    
            except Exception as e:
                print(f"Request {i+1}: Error - {e}")
                times.append(999)  # High penalty for errors
            
            # Small delay between requests
            time.sleep(0.5)
        
        avg_time = sum(times) / len(times)
        cache_hit_rate = cached_responses / len(times)
        
        print(f"📊 Average response time: {avg_time:.3f}s")
        print(f"💾 Cache hit rate: {cache_hit_rate:.1%}")
        
        return {
            "test": "cache_performance",
            "success": avg_time < 2.0,
            "avg_response_time": avg_time,
            "cache_hit_rate": cache_hit_rate,
            "total_requests": len(times)
        }
    
    def test_batch_crypto_prices(self) -> Dict[str, Any]:
        """Test batch cryptocurrency price fetching"""
        print("\n🧪 Testing batch crypto price fetching...")
        
        symbols = ["BTC-USD", "ETH-USD", "ADA-USD"]
        
        start_time = time.time()
        try:
            response = requests.post(
                f"{self.base_url}/api/yahoo-finance/crypto/batch",
                json={"symbols": symbols},
                timeout=30
            )
            elapsed = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                successful_fetches = sum(1 for v in data['data'].values() if v is not None)
                
                print(f"✅ Fetched {successful_fetches}/{len(symbols)} cryptocurrencies")
                print(f"⏱️ Response time: {elapsed:.2f}s")
                
                for symbol, price_data in data['data'].items():
                    if price_data:
                        print(f"  {symbol}: ${price_data['currentPrice']:,.2f}")
                
                return {
                    "test": "batch_crypto_prices",
                    "success": successful_fetches > 0,
                    "response_time": elapsed,
                    "successful_fetches": successful_fetches,
                    "total_symbols": len(symbols)
                }
            else:
                print(f"❌ Failed: HTTP {response.status_code}")
                return {"test": "batch_crypto_prices", "success": False, "error": f"HTTP {response.status_code}"}
                
        except Exception as e:
            print(f"❌ Error: {e}")
            return {"test": "batch_crypto_prices", "success": False, "error": str(e)}
    
    def test_metrics_endpoint(self) -> Dict[str, Any]:
        """Test metrics endpoint"""
        print("\n🧪 Testing metrics endpoint...")
        
        try:
            response = requests.get(f"{self.base_url}/api/yahoo-finance/metrics", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                metrics = data['metrics']
                
                print(f"✅ Metrics retrieved successfully")
                print(f"📊 Cache hits: {metrics['cacheHits']}")
                print(f"📊 Cache misses: {metrics['cacheMisses']}")
                print(f"📊 Hit rate: {metrics['hitRate']:.1%}")
                print(f"📊 API calls: {metrics['apiCalls']}")
                print(f"📊 Circuit breaker opens: {metrics['circuitBreakerOpens']}")
                print(f"📊 Average response time: {metrics['averageResponseTime']:.0f}ms")
                
                return {
                    "test": "metrics_endpoint",
                    "success": True,
                    "metrics": metrics
                }
            else:
                print(f"❌ Failed: HTTP {response.status_code}")
                return {"test": "metrics_endpoint", "success": False, "error": f"HTTP {response.status_code}"}
                
        except Exception as e:
            print(f"❌ Error: {e}")
            return {"test": "metrics_endpoint", "success": False, "error": str(e)}
    
    def test_health_check(self) -> Dict[str, Any]:
        """Test health check endpoint"""
        print("\n🧪 Testing health check endpoint...")
        
        try:
            response = requests.get(f"{self.base_url}/api/yahoo-finance/health", timeout=10)
            
            if response.status_code in [200, 503]:  # Both healthy and unhealthy are valid responses
                data = response.json()
                
                print(f"✅ Health check completed")
                print(f"🏥 Status: {data['status']}")
                print(f"💾 Cache size: {data['metrics']['cacheSize']}")
                print(f"📊 Hit rate: {data['metrics']['hitRate']:.1%}")
                
                return {
                    "test": "health_check",
                    "success": True,
                    "status": data['status'],
                    "healthy": response.status_code == 200
                }
            else:
                print(f"❌ Unexpected status: HTTP {response.status_code}")
                return {"test": "health_check", "success": False, "error": f"HTTP {response.status_code}"}
                
        except Exception as e:
            print(f"❌ Error: {e}")
            return {"test": "health_check", "success": False, "error": str(e)}
    
    def test_bitcoin_research_integration(self) -> Dict[str, Any]:
        """Test Bitcoin research integration"""
        print("\n🧪 Testing Bitcoin research integration...")
        
        start_time = time.time()
        try:
            response = requests.post(
                f"{self.base_url}/api/research",
                json={
                    "query": "Bitcoin market analysis and price outlook",
                    "depth": 3,
                    "includeMarketData": True
                },
                timeout=60
            )
            elapsed = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                report_length = len(data.get('report', ''))
                
                print(f"✅ Bitcoin research completed")
                print(f"📄 Report length: {report_length} characters")
                print(f"⏱️ Response time: {elapsed:.2f}s")
                print(f"🔗 Sources: {len(data.get('sources', []))}")
                
                return {
                    "test": "bitcoin_research_integration",
                    "success": report_length > 100,
                    "response_time": elapsed,
                    "report_length": report_length,
                    "sources_count": len(data.get('sources', []))
                }
            else:
                print(f"❌ Failed: HTTP {response.status_code}")
                return {"test": "bitcoin_research_integration", "success": False, "error": f"HTTP {response.status_code}"}
                
        except Exception as e:
            print(f"❌ Error: {e}")
            return {"test": "bitcoin_research_integration", "success": False, "error": str(e)}
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all tests and return results"""
        print("🚀 Starting Yahoo Finance Optimization Tests")
        print("=" * 60)
        
        tests = [
            self.test_basic_bitcoin_price,
            self.test_cache_performance,
            self.test_batch_crypto_prices,
            self.test_metrics_endpoint,
            self.test_health_check,
            self.test_bitcoin_research_integration
        ]
        
        results = []
        passed = 0
        
        for test_func in tests:
            result = test_func()
            results.append(result)
            if result.get('success', False):
                passed += 1
        
        print("\n" + "=" * 60)
        print(f"🎯 Tests completed: {passed}/{len(tests)} passed")
        
        summary = {
            "total_tests": len(tests),
            "passed": passed,
            "failed": len(tests) - passed,
            "success_rate": passed / len(tests),
            "results": results,
            "timestamp": time.time()
        }
        
        return summary

def main():
    """Main test runner"""
    tester = YahooFinanceOptimizationTester()
    results = tester.run_all_tests()
    
    # Save results to file
    with open('yahoo_finance_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n💾 Results saved to yahoo_finance_test_results.json")
    
    if results['success_rate'] >= 0.8:
        print("🎉 Yahoo Finance optimization is working well!")
        return 0
    else:
        print("⚠️ Some Yahoo Finance optimization issues detected")
        return 1

if __name__ == "__main__":
    exit(main())
