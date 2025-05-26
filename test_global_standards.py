
#!/usr/bin/env python3
"""
Global Testing Standards for All Features
Based on DeerFlow testing methodology
"""

import asyncio
import json
import time
import logging
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TestStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    WARNING = "warning"
    SKIPPED = "skipped"

@dataclass
class TestResult:
    name: str
    status: TestStatus
    duration: float
    details: Dict[str, Any]
    error: Optional[str] = None
    warnings: List[str] = None
    metrics: Dict[str, Any] = None

    def __post_init__(self):
        if self.warnings is None:
            self.warnings = []
        if self.metrics is None:
            self.metrics = {}

@dataclass
class TestConfig:
    base_url: str = "http://0.0.0.0:3000"
    timeout_short: int = 5
    timeout_medium: int = 15
    timeout_long: int = 30
    max_retries: int = 3
    retry_delay: float = 1.0
    performance_threshold: float = 2.0
    success_rate_threshold: float = 0.8
    parallel_tests: bool = True
    max_workers: int = 4

class GlobalTestFramework:
    """
    Global testing framework that can be applied to any feature
    """
    
    def __init__(self, config: TestConfig = None):
        self.config = config or TestConfig()
        self.results: List[TestResult] = []
        self.start_time = 0

    async def run_test_suite(self, feature_name: str, tests: List[Callable]) -> List[TestResult]:
        """Run a complete test suite for any feature"""
        print(f"🚀 Starting {feature_name} Test Suite")
        print("=" * 60)
        
        self.start_time = time.time()
        self.results = []

        # Run tests
        if self.config.parallel_tests:
            await self._run_tests_parallel(tests)
        else:
            await self._run_tests_sequential(tests)

        # Generate report
        self._print_summary(feature_name)
        await self._save_results(feature_name)
        
        return self.results

    async def _run_tests_parallel(self, tests: List[Callable]):
        """Run tests in parallel"""
        tasks = [self._run_single_test(test) for test in tests]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for result in results:
            if isinstance(result, Exception):
                self.results.append(TestResult(
                    name="Unknown Test",
                    status=TestStatus.FAILED,
                    duration=0,
                    details={},
                    error=str(result)
                ))
            else:
                self.results.append(result)

    async def _run_tests_sequential(self, tests: List[Callable]):
        """Run tests sequentially"""
        for test in tests:
            result = await self._run_single_test(test)
            self.results.append(result)

    async def _run_single_test(self, test_func: Callable) -> TestResult:
        """Run a single test with error handling and timing"""
        start = time.time()
        test_name = getattr(test_func, '__name__', 'Unknown Test')
        
        try:
            # Run test with timeout
            result = await asyncio.wait_for(
                test_func(),
                timeout=self.config.timeout_medium
            )
            
            if isinstance(result, TestResult):
                result.duration = time.time() - start
                return result
            else:
                return TestResult(
                    name=test_name,
                    status=TestStatus.PASSED,
                    duration=time.time() - start,
                    details=result if isinstance(result, dict) else {}
                )
                
        except asyncio.TimeoutError:
            return TestResult(
                name=test_name,
                status=TestStatus.FAILED,
                duration=time.time() - start,
                details={},
                error=f"Test timed out after {self.config.timeout_medium}s"
            )
        except Exception as e:
            return TestResult(
                name=test_name,
                status=TestStatus.FAILED,
                duration=time.time() - start,
                details={},
                error=str(e)
            )

    def _print_summary(self, feature_name: str):
        """Print test summary"""
        total_duration = time.time() - self.start_time
        passed = sum(1 for r in self.results if r.status == TestStatus.PASSED)
        failed = sum(1 for r in self.results if r.status == TestStatus.FAILED)
        warnings = sum(1 for r in self.results if r.status == TestStatus.WARNING)
        
        print(f"\n📊 {feature_name} Test Results Summary")
        print("=" * 60)
        print(f"Total Tests: {len(self.results)}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"⚠️ Warnings: {warnings}")
        print(f"Success Rate: {(passed/len(self.results)*100):.1f}%")
        print(f"Duration: {total_duration:.2f}s")
        print("=" * 60)

        # Detailed results
        for i, result in enumerate(self.results, 1):
            icon = {
                TestStatus.PASSED: "✅",
                TestStatus.FAILED: "❌", 
                TestStatus.WARNING: "⚠️",
                TestStatus.SKIPPED: "⏭️"
            }.get(result.status, "❓")
            
            print(f"{i}. {result.name} {icon} ({result.duration:.3f}s)")
            if result.error:
                print(f"   Error: {result.error}")
            if result.warnings:
                for warning in result.warnings:
                    print(f"   Warning: {warning}")

    async def _save_results(self, feature_name: str):
        """Save test results to file"""
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        filename = f"{feature_name.lower().replace(' ', '_')}_test_results_{timestamp}.json"
        
        report_data = {
            "feature": feature_name,
            "timestamp": timestamp,
            "duration": time.time() - self.start_time,
            "config": asdict(self.config),
            "results": [asdict(r) for r in self.results],
            "summary": {
                "total": len(self.results),
                "passed": sum(1 for r in self.results if r.status == TestStatus.PASSED),
                "failed": sum(1 for r in self.results if r.status == TestStatus.FAILED),
                "warnings": sum(1 for r in self.results if r.status == TestStatus.WARNING)
            }
        }
        
        with open(filename, 'w') as f:
            json.dump(report_data, f, indent=2, default=str)
        
        print(f"📄 Results saved to: {filename}")

# Standard test utilities
class TestUtils:
    @staticmethod
    async def test_api_endpoint(url: str, method: str = "GET", data: Dict = None, timeout: int = 10) -> Dict[str, Any]:
        """Test an API endpoint"""
        try:
            if method.upper() == "GET":
                response = requests.get(url, timeout=timeout)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, timeout=timeout)
            else:
                response = requests.request(method, url, json=data, timeout=timeout)
            
            return {
                "status_code": response.status_code,
                "success": response.ok,
                "response_time": response.elapsed.total_seconds(),
                "data": response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text[:100]
            }
        except Exception as e:
            return {
                "status_code": 0,
                "success": False,
                "error": str(e)
            }

    @staticmethod
    async def test_performance(func: Callable, iterations: int = 10) -> Dict[str, Any]:
        """Test performance of a function"""
        times = []
        errors = 0
        
        for _ in range(iterations):
            start = time.time()
            try:
                await func() if asyncio.iscoroutinefunction(func) else func()
                times.append(time.time() - start)
            except:
                errors += 1
        
        if times:
            return {
                "avg_time": sum(times) / len(times),
                "min_time": min(times),
                "max_time": max(times),
                "success_rate": (iterations - errors) / iterations,
                "total_errors": errors
            }
        else:
            return {"error": "All iterations failed"}

# Example: SuSi Chat specific tests
async def test_susi_chat_functionality():
    """Test SuSi Chat feature using global standards"""
    
    framework = GlobalTestFramework(TestConfig(base_url="http://0.0.0.0:3000"))
    
    async def test_susi_health():
        """Test SuSi health endpoint"""
        result = await TestUtils.test_api_endpoint("http://0.0.0.0:3000/health")
        
        if result["success"]:
            return TestResult(
                name="SuSi Health Check",
                status=TestStatus.PASSED,
                duration=0,
                details=result
            )
        else:
            return TestResult(
                name="SuSi Health Check", 
                status=TestStatus.FAILED,
                duration=0,
                details=result,
                error="Health check failed"
            )

    async def test_susi_chat_api():
        """Test SuSi chat API"""
        chat_data = {
            "message": "Hello SuSi!",
            "userId": "test-user"
        }
        
        result = await TestUtils.test_api_endpoint(
            "http://0.0.0.0:3000/api/chat/message",
            method="POST",
            data=chat_data
        )
        
        status = TestStatus.PASSED if result["success"] else TestStatus.FAILED
        
        return TestResult(
            name="SuSi Chat API",
            status=status,
            duration=0,
            details=result,
            error=None if result["success"] else "Chat API failed"
        )

    async def test_susi_performance():
        """Test SuSi performance"""
        async def chat_request():
            return await TestUtils.test_api_endpoint(
                "http://0.0.0.0:3000/api/chat/message",
                method="POST",
                data={"message": "Performance test", "userId": "perf-test"}
            )
        
        perf_result = await TestUtils.test_performance(chat_request, iterations=5)
        
        is_performant = perf_result.get("avg_time", 0) < 2.0
        status = TestStatus.PASSED if is_performant else TestStatus.WARNING
        
        return TestResult(
            name="SuSi Performance Test",
            status=status,
            duration=0,
            details=perf_result,
            warnings=[] if is_performant else ["Performance below threshold"]
        )

    # Run the test suite
    tests = [test_susi_health, test_susi_chat_api, test_susi_performance]
    return await framework.run_test_suite("SuSi Chat", tests)

if __name__ == "__main__":
    asyncio.run(test_susi_chat_functionality())
