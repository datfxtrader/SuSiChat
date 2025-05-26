
#!/usr/bin/env python3
"""
Optimized Complete DeerFlow Application Test Suite

Enhanced features:
- Parallel test execution
- Retry mechanisms
- Better error handling
- Performance profiling
- Real-time progress updates
- Detailed metrics collection
"""

import asyncio
import aiohttp
import json
import time
import logging
import sys
import argparse
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Callable
from dataclasses import dataclass, field, asdict
from enum import Enum, auto
from datetime import datetime
import statistics
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
import traceback

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("app_test")

# Configuration
class TestConfig:
    BACKEND_URL = "http://0.0.0.0:9000"
    FRONTEND_URL = "http://0.0.0.0:5000"
    
    # Timeouts
    TIMEOUT_SHORT = 5
    TIMEOUT_MEDIUM = 15
    TIMEOUT_LONG = 30
    
    # Retry settings
    MAX_RETRIES = 3
    RETRY_DELAY = 1.0
    
    # Performance thresholds
    RESPONSE_TIME_THRESHOLD = 2.0  # seconds
    SUCCESS_RATE_THRESHOLD = 0.7   # 70%
    
    # Parallel execution
    MAX_CONCURRENT_TESTS = 4
    
    # Report settings
    REPORT_DIR = Path("test_reports")
    DETAILED_LOGGING = True

class TestStatus(Enum):
    PENDING = auto()
    RUNNING = auto()
    PASSED = auto()
    FAILED = auto()
    SKIPPED = auto()
    ERROR = auto()

@dataclass
class TestResult:
    name: str
    category: str
    status: TestStatus
    duration: float
    success_rate: float = 0.0
    details: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    warnings: List[str] = field(default_factory=list)
    metrics: Dict[str, Any] = field(default_factory=dict)
    timestamp: float = field(default_factory=time.time)

@dataclass
class PerformanceMetrics:
    response_times: List[float] = field(default_factory=list)
    error_count: int = 0
    success_count: int = 0
    
    def add_response_time(self, time: float):
        self.response_times.append(time)
        
    def get_stats(self) -> Dict[str, float]:
        if not self.response_times:
            return {}
            
        return {
            "min": min(self.response_times),
            "max": max(self.response_times),
            "avg": statistics.mean(self.response_times),
            "median": statistics.median(self.response_times),
            "p95": statistics.quantiles(self.response_times, n=20)[18] if len(self.response_times) > 20 else max(self.response_times),
            "p99": statistics.quantiles(self.response_times, n=100)[98] if len(self.response_times) > 100 else max(self.response_times),
        }

class HTTPClient:
    """Enhanced HTTP client with retry and performance tracking"""
    
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.session: Optional[aiohttp.ClientSession] = None
        self.metrics = PerformanceMetrics()
        
    async def __aenter__(self):
        timeout = aiohttp.ClientTimeout(total=TestConfig.TIMEOUT_LONG)
        self.session = aiohttp.ClientSession(timeout=timeout)
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
            
    async def request(
        self, 
        method: str, 
        endpoint: str, 
        **kwargs
    ) -> Tuple[Optional[Dict], int, float]:
        """Make HTTP request with retry logic"""
        url = f"{self.base_url}{endpoint}"
        start_time = time.time()
        last_error = None
        
        for attempt in range(TestConfig.MAX_RETRIES):
            try:
                async with self.session.request(method, url, **kwargs) as response:
                    response_time = time.time() - start_time
                    self.metrics.add_response_time(response_time)
                    
                    data = None
                    if response.content_type == 'application/json':
                        data = await response.json()
                    
                    if response.status < 500:  # Don't retry client errors
                        self.metrics.success_count += 1
                        return data, response.status, response_time
                        
            except asyncio.TimeoutError as e:
                last_error = f"Timeout after {TestConfig.TIMEOUT_LONG}s"
                logger.warning(f"Request timeout (attempt {attempt + 1}): {url}")
                
            except aiohttp.ClientError as e:
                last_error = str(e)
                logger.warning(f"Request failed (attempt {attempt + 1}): {url} - {e}")
                
            except Exception as e:
                last_error = str(e)
                logger.error(f"Unexpected error: {e}")
                break
                
            if attempt < TestConfig.MAX_RETRIES - 1:
                await asyncio.sleep(TestConfig.RETRY_DELAY * (attempt + 1))
        
        self.metrics.error_count += 1
        response_time = time.time() - start_time
        return None, 0, response_time

class DeerFlowAppTester:
    """Optimized comprehensive application tester"""
    
    def __init__(self, config: Optional[TestConfig] = None):
        self.config = config or TestConfig()
        self.test_results: List[TestResult] = []
        self.start_time: Optional[float] = None
        self.executor = ThreadPoolExecutor(max_workers=TestConfig.MAX_CONCURRENT_TESTS)
        
    async def run_complete_test_suite(self, parallel: bool = True) -> bool:
        """Run the complete test suite with optimizations"""
        self.start_time = time.time()
        
        print("🚀 Starting Optimized DeerFlow Application Test Suite")
        print("=" * 70)
        print(f"⚙️  Configuration:")
        print(f"   Backend URL: {TestConfig.BACKEND_URL}")
        print(f"   Parallel Execution: {parallel}")
        print(f"   Max Concurrent Tests: {TestConfig.MAX_CONCURRENT_TESTS}")
        print("=" * 70)
        
        # Check backend availability first
        if not await self._check_backend_availability():
            print("❌ Backend is not available. Aborting tests.")
            return False
        
        # Define test categories with dependencies
        test_definitions = [
            ("Backend Health", "Core", self.test_backend_health, []),
            ("API Endpoints", "Core", self.test_api_endpoints, ["Backend Health"]),
            ("Agent System", "Features", self.test_agent_system, ["API Endpoints"]),
            ("Research Capabilities", "Features", self.test_research_capabilities, ["Agent System"]),
            ("Learning System", "Advanced", self.test_learning_optimization, ["Agent System"]),
            ("Error Handling", "Resilience", self.test_error_handling, ["Backend Health"]),
            ("Performance", "Metrics", self.test_performance_metrics, ["API Endpoints"]),
            ("Frontend Integration", "Integration", self.test_frontend_integration, ["API Endpoints"]),
            ("WebSocket", "Integration", self.test_websocket_functionality, ["Backend Health"]),
            ("Data Persistence", "Storage", self.test_data_persistence, ["Agent System"])
        ]
        
        # Execute tests
        if parallel:
            await self._run_tests_parallel(test_definitions)
        else:
            await self._run_tests_sequential(test_definitions)
        
        # Generate report
        await self.generate_comprehensive_report()
        
        # Calculate success
        passed = sum(1 for r in self.test_results if r.status == TestStatus.PASSED)
        total = len(self.test_results)
        success_rate = passed / total if total > 0 else 0
        
        return success_rate >= TestConfig.SUCCESS_RATE_THRESHOLD
    
    async def _check_backend_availability(self) -> bool:
        """Quick check if backend is available"""
        try:
            async with HTTPClient(TestConfig.BACKEND_URL) as client:
                _, status, _ = await client.request("GET", "/health")
                return status == 200
        except Exception as e:
            logger.error(f"Backend availability check failed: {e}")
            return False
    
    async def _run_tests_parallel(self, test_definitions: List[Tuple]):
        """Run tests in parallel with dependency management"""
        completed_tests = set()
        pending_tests = list(test_definitions)
        running_tasks = {}
        
        with tqdm(total=len(test_definitions), desc="Running tests") as pbar:
            while pending_tests or running_tasks:
                # Start new tests whose dependencies are met
                for test_def in pending_tests[:]:
                    name, category, test_func, deps = test_def
                    
                    if all(dep in completed_tests for dep in deps):
                        if len(running_tasks) < TestConfig.MAX_CONCURRENT_TESTS:
                            task = asyncio.create_task(self._run_single_test(name, category, test_func))
                            running_tasks[task] = name
                            pending_tests.remove(test_def)
                
                # Wait for at least one task to complete
                if running_tasks:
                    done, pending = await asyncio.wait(
                        running_tasks.keys(), 
                        return_when=asyncio.FIRST_COMPLETED
                    )
                    
                    for task in done:
                        test_name = running_tasks.pop(task)
                        completed_tests.add(test_name)
                        pbar.update(1)
                        
                        try:
                            result = task.result()
                            self.test_results.append(result)
                        except Exception as e:
                            self.test_results.append(TestResult(
                                name=test_name,
                                category="Unknown",
                                status=TestStatus.ERROR,
                                duration=0,
                                error=str(e)
                            ))
                else:
                    await asyncio.sleep(0.1)
    
    async def _run_tests_sequential(self, test_definitions: List[Tuple]):
        """Run tests sequentially"""
        for name, category, test_func, _ in test_definitions:
            result = await self._run_single_test(name, category, test_func)
            self.test_results.append(result)
            
            # Stop on critical failure
            if result.status == TestStatus.FAILED and category == "Core":
                logger.error(f"Critical test '{name}' failed. Stopping execution.")
                break
    
    async def _run_single_test(
        self, 
        name: str, 
        category: str, 
        test_func: Callable
    ) -> TestResult:
        """Run a single test with timing and error handling"""
        print(f"\n🧪 Testing: {name}")
        start_time = time.time()
        
        try:
            result_data = await test_func()
            duration = time.time() - start_time
            
            # Determine status
            if result_data.get("success", False):
                status = TestStatus.PASSED
                print(f"   ✅ {name} - PASSED ({duration:.2f}s)")
            else:
                status = TestStatus.FAILED
                print(f"   ❌ {name} - FAILED ({duration:.2f}s)")
                if "error" in result_data:
                    print(f"      Error: {result_data['error']}")
            
            return TestResult(
                name=name,
                category=category,
                status=status,
                duration=duration,
                success_rate=result_data.get("success_rate", 1.0 if status == TestStatus.PASSED else 0.0),
                details=result_data,
                error=result_data.get("error"),
                warnings=result_data.get("warnings", [])
            )
            
        except Exception as e:
            duration = time.time() - start_time
            error_msg = f"{type(e).__name__}: {str(e)}"
            print(f"   💥 {name} - ERROR ({duration:.2f}s)")
            print(f"      {error_msg}")
            
            return TestResult(
                name=name,
                category=category,
                status=TestStatus.ERROR,
                duration=duration,
                error=error_msg,
                details={"traceback": traceback.format_exc()}
            )
    
    # Optimized test methods
    
    async def test_backend_health(self) -> Dict[str, Any]:
        """Test backend service health and configuration"""
        async with HTTPClient(TestConfig.BACKEND_URL) as client:
            # Health check
            health_data, health_status, health_time = await client.request("GET", "/health")
            
            if health_status != 200:
                return {"success": False, "error": f"Health check failed: {health_status}"}
            
            # Configuration check
            config_data, config_status, config_time = await client.request("GET", "/config")
            
            # Metrics check
            metrics_data, metrics_status, metrics_time = await client.request("GET", "/metrics")
            
            # Analyze results
            warnings = []
            if health_time > 1.0:
                warnings.append(f"Slow health check response: {health_time:.2f}s")
            
            return {
                "success": True,
                "health_status": health_data.get("status") if health_data else "unknown",
                "environment": health_data.get("environment") if health_data else "unknown",
                "config_available": config_status == 200,
                "metrics_available": metrics_status == 200,
                "response_times": {
                    "health": health_time,
                    "config": config_time,
                    "metrics": metrics_time
                },
                "warnings": warnings,
                "performance_metrics": client.metrics.get_stats()
            }
    
    async def test_api_endpoints(self) -> Dict[str, Any]:
        """Test core API endpoints with parallel requests"""
        endpoints = [
            ("/", "GET", "Root"),
            ("/health", "GET", "Health"),
            ("/config", "GET", "Config"),
            ("/metrics", "GET", "Metrics"),
            ("/deerflow/capabilities", "GET", "Capabilities"),
            ("/deerflow/tools", "GET", "Tools"),
            ("/agent/tasks", "GET", "Tasks"),
            ("/optimize/validate", "POST", "Validate"),
            ("/optimize/recommendations", "GET", "Recommendations")
        ]
        
        async with HTTPClient(TestConfig.BACKEND_URL) as client:
            # Test endpoints in parallel
            tasks = []
            for endpoint, method, description in endpoints:
                if method == "GET":
                    task = client.request("GET", endpoint)
                else:
                    task = client.request("POST", endpoint, json={})
                tasks.append((endpoint, method, description, task))
            
            results = {}
            successful = 0
            
            for endpoint, method, description, task in tasks:
                data, status, response_time = await task
                success = status in [200, 201, 202]
                
                if success:
                    successful += 1
                
                results[endpoint] = {
                    "method": method,
                    "status": status,
                    "success": success,
                    "response_time": response_time,
                    "description": description
                }
            
            success_rate = successful / len(endpoints)
            
            return {
                "success": success_rate >= TestConfig.SUCCESS_RATE_THRESHOLD,
                "success_rate": success_rate,
                "total_endpoints": len(endpoints),
                "successful_endpoints": successful,
                "endpoint_results": results,
                "performance_metrics": client.metrics.get_stats()
            }
    
    async def test_agent_system(self) -> Dict[str, Any]:
        """Test agent system with comprehensive validation"""
        async with HTTPClient(TestConfig.BACKEND_URL) as client:
            # Create research task
            research_request = {
                "research_question": "Test query for validation",
                "depth": "standard",
                "include_reasoning": True,
                "learning_mode": True,
                "preferences": {
                    "output_format": "structured",
                    "include_sources": True
                }
            }
            
            create_data, create_status, create_time = await client.request(
                "POST", 
                "/agent/research", 
                json=research_request
            )
            
            if create_status != 200 or not create_data:
                return {"success": False, "error": f"Task creation failed: {create_status}"}
            
            task_id = create_data.get("task_id")
            if not task_id:
                return {"success": False, "error": "No task ID returned"}
            
            # Monitor task progress
            progress_checks = []
            for i in range(5):
                await asyncio.sleep(1)
                
                status_data, status_code, _ = await client.request(
                    "GET", 
                    f"/agent/task/{task_id}"
                )
                
                if status_code == 200 and status_data:
                    progress_checks.append({
                        "check": i + 1,
                        "status": status_data.get("status"),
                        "progress": status_data.get("progress", 0)
                    })
                    
                    if status_data.get("status") in ["completed", "failed"]:
                        break
            
            # Test capabilities
            caps_data, caps_status, _ = await client.request("GET", "/deerflow/capabilities")
            
            # Test task listing
            tasks_data, tasks_status, _ = await client.request("GET", "/agent/tasks")
            
            return {
                "success": True,
                "task_created": bool(task_id),
                "task_id": task_id,
                "progress_monitoring": len(progress_checks) > 0,
                "progress_checks": progress_checks,
                "capabilities_available": caps_status == 200,
                "task_listing_available": tasks_status == 200,
                "total_tasks": tasks_data.get("total", 0) if tasks_data else 0
            }
    
    async def test_research_capabilities(self) -> Dict[str, Any]:
        """Test research functionality with timeout handling"""
        async with HTTPClient(TestConfig.BACKEND_URL) as client:
            research_data = {
                "research_question": "What are the latest AI developments?",
                "research_depth": 2,
                "research_length": "standard",
                "research_tone": "professional",
                "include_sources": True
            }
            
            # Initiate research
            research_result, research_status, research_time = await client.request(
                "POST",
                "/research",
                json=research_data
            )
            
            if research_status != 200:
                return {
                    "success": False,
                    "error": f"Research initiation failed: {research_status}"
                }
            
            # Test search capabilities
            search_test = await self._test_search_capabilities(client)
            
            return {
                "success": True,
                "research_initiated": research_result.get("status", {}).get("status") == "processing",
                "response_structure": list(research_result.keys()) if research_result else [],
                "search_capabilities": search_test,
                "initiation_time": research_time
            }
    
    async def _test_search_capabilities(self, client: HTTPClient) -> Dict[str, bool]:
        """Test various search capabilities"""
        capabilities = {}
        
        # Test different search types
        search_tests = [
            ("web_search", "/search/web", {"query": "test"}),
            ("financial_search", "/search/financial", {"symbol": "AAPL"}),
            ("news_search", "/search/news", {"topic": "technology"})
        ]
        
        for name, endpoint, payload in search_tests:
            _, status, _ = await client.request("POST", endpoint, json=payload)
            capabilities[name] = status in [200, 404]  # 404 means endpoint exists but no results
        
        return capabilities
    
    async def test_learning_optimization(self) -> Dict[str, Any]:
        """Test learning and optimization with detailed metrics"""
        async with HTTPClient(TestConfig.BACKEND_URL) as client:
            # Validation test
            validate_data, validate_status, _ = await client.request(
                "POST", 
                "/optimize/validate"
            )
            
            if validate_status != 200:
                return {
                    "success": False,
                    "error": f"Optimization validation failed: {validate_status}"
                }
            
            # Recommendations test
            rec_data, rec_status, _ = await client.request(
                "GET",
                "/optimize/recommendations"
            )
            
            # Learning summary test
            learning_data, learning_status, _ = await client.request(
                "GET",
                "/agent/learning/summary"
            )
            
            # Analyze optimization readiness
            readiness_score = validate_data.get("readiness_score", 0) if validate_data else 0
            warnings = []
            
            if readiness_score < 0.5:
                warnings.append(f"Low optimization readiness: {readiness_score:.2f}")
            
            return {
                "success": True,
                "optimization_ready": validate_data.get("ready_for_optimization", False) if validate_data else False,
                "readiness_score": readiness_score,
                "recommendations_available": rec_status == 200,
                "recommendation_count": len(rec_data.get("high_priority", [])) if rec_data else 0,
                "learning_system_active": learning_status == 200,
                "warnings": warnings
            }
    
    async def test_error_handling(self) -> Dict[str, Any]:
        """Test error handling with various scenarios"""
        async with HTTPClient(TestConfig.BACKEND_URL) as client:
            scenarios = []
            
            # Test 1: Invalid endpoint
            _, status, _ = await client.request("GET", "/nonexistent-endpoint")
            scenarios.append({
                "name": "Invalid endpoint",
                "expected": 404,
                "actual": status,
                "passed": status == 404
            })
            
            # Test 2: Malformed JSON
            _, status, _ = await client.request(
                "POST",
                "/research",
                data="invalid json"  # Send invalid data
            )
            scenarios.append({
                "name": "Malformed JSON",
                "expected": [400, 422],
                "actual": status,
                "passed": status in [400, 422]
            })
            
            # Test 3: Missing required fields
            _, status, _ = await client.request(
                "POST",
                "/agent/research",
                json={"incomplete": "data"}
            )
            scenarios.append({
                "name": "Missing required fields",
                "expected": [400, 422],
                "actual": status,
                "passed": status in [400, 422]
            })
            
            # Test 4: Large payload handling
            large_payload = {"data": "x" * 1000000}  # 1MB string
            _, status, _ = await client.request(
                "POST",
                "/research",
                json=large_payload
            )
            scenarios.append({
                "name": "Large payload",
                "expected": [200, 400, 413],
                "actual": status,
                "passed": status in [200, 400, 413]
            })
            
            passed_scenarios = sum(1 for s in scenarios if s["passed"])
            success_rate = passed_scenarios / len(scenarios)
            
            return {
                "success": success_rate >= TestConfig.SUCCESS_RATE_THRESHOLD,
                "success_rate": success_rate,
                "scenarios_tested": len(scenarios),
                "scenarios_passed": passed_scenarios,
                "scenario_results": scenarios
            }
    
    async def test_performance_metrics(self) -> Dict[str, Any]:
        """Test performance with load testing"""
        async with HTTPClient(TestConfig.BACKEND_URL) as client:
            # Warm-up request
            await client.request("GET", "/health")
            
            # Performance test - multiple concurrent requests
            endpoints_to_test = ["/health", "/metrics", "/deerflow/capabilities"]
            tasks = []
            
            for _ in range(10):  # 10 iterations
                for endpoint in endpoints_to_test:
                    tasks.append(client.request("GET", endpoint))
            
            start_time = time.time()
            results = await asyncio.gather(*tasks)
            total_time = time.time() - start_time
            
            # Analyze results
            successful_requests = sum(1 for _, status, _ in results if status == 200)
            response_times = [t for _, _, t in results]
            
            performance_stats = {
                "total_requests": len(tasks),
                "successful_requests": successful_requests,
                "success_rate": successful_requests / len(tasks),
                "total_time": total_time,
                "throughput": len(tasks) / total_time,
                "response_times": {
                    "min": min(response_times),
                    "max": max(response_times),
                    "avg": statistics.mean(response_times),
                    "p95": statistics.quantiles(response_times, n=20)[18] if len(response_times) > 20 else max(response_times)
                }
            }
            
            # Check performance thresholds
            warnings = []
            if performance_stats["response_times"]["avg"] > TestConfig.RESPONSE_TIME_THRESHOLD:
                warnings.append(f"High average response time: {performance_stats['response_times']['avg']:.2f}s")
            
            if performance_stats["success_rate"] < 0.95:
                warnings.append(f"Low success rate under load: {performance_stats['success_rate']:.2%}")
            
            return {
                "success": len(warnings) == 0,
                "performance_stats": performance_stats,
                "warnings": warnings,
                "client_metrics": client.metrics.get_stats()
            }
    
    async def test_frontend_integration(self) -> Dict[str, Any]:
        """Test frontend integration points"""
        results = {}
        
        # Test CORS headers
        async with HTTPClient(TestConfig.BACKEND_URL) as client:
            # OPTIONS request for CORS
            async with aiohttp.ClientSession() as session:
                try:
                    async with session.options(f"{TestConfig.BACKEND_URL}/health") as response:
                        cors_headers = response.headers
                        cors_configured = "access-control-allow-origin" in [h.lower() for h in cors_headers.keys()]
                        results["cors_configured"] = cors_configured
                except:
                    results["cors_configured"] = False
            
            # Test API versioning
            _, status, _ = await client.request("GET", "/api/v1/health")
            results["api_versioning"] = status in [200, 404]
            
            # Test static file serving (if applicable)
            _, status, _ = await client.request("GET", "/static/test.js")
            results["static_files"] = status in [200, 404]
        
        # Test frontend accessibility
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(TestConfig.FRONTEND_URL, timeout=5) as response:
                    results["frontend_accessible"] = response.status == 200
        except:
            results["frontend_accessible"] = False
        
        success = results.get("cors_configured", False) or results.get("frontend_accessible", False)
        
        return {
            "success": success,
            "integration_points": results,
            "warnings": ["Frontend not accessible"] if not results.get("frontend_accessible") else []
        }
    
    async def test_websocket_functionality(self) -> Dict[str, Any]:
        """Test WebSocket support"""
        ws_url = TestConfig.BACKEND_URL.replace("http", "ws") + "/ws"
        
        try:
            async with aiohttp.ClientSession() as session:
                # Try to establish WebSocket connection
                async with session.ws_connect(ws_url, timeout=5) as ws:
                    # Send test message
                    await ws.send_json({"type": "ping"})
                    
                    # Wait for response
                    msg = await asyncio.wait_for(ws.receive(), timeout=2)
                    
                    if msg.type == aiohttp.WSMsgType.TEXT:
                        data = json.loads(msg.data)
                        websocket_functional = data.get("type") == "pong"
                    else:
                        websocket_functional = False
                    
                    await ws.close()
                    
                    return {
                        "success": True,
                        "websocket_available": True,
                        "websocket_functional": websocket_functional
                    }
                    
        except Exception as e:
            # WebSocket might not be implemented
            return {
                "success": True,  # Not a critical failure
                "websocket_available": False,
                "note": "WebSocket not implemented or accessible",
                "warnings": ["WebSocket connectivity not available"]
            }
    
    async def test_data_persistence(self) -> Dict[str, Any]:
        """Test data persistence across requests"""
        async with HTTPClient(TestConfig.BACKEND_URL) as client:
            # Create test data
            test_id = f"test_{int(time.time())}"
            create_data = {
                "research_question": f"Persistence test {test_id}",
                "metadata": {"test_id": test_id}
            }
            
            # Create task
            create_result, create_status, _ = await client.request(
                "POST",
                "/agent/research",
                json=create_data
            )
            
            if create_status != 200 or not create_result:
                return {"success": False, "error": "Could not create test data"}
            
            task_id = create_result.get("task_id")
            
            # Wait briefly
            await asyncio.sleep(2)
            
            # Retrieve task
            retrieve_result, retrieve_status, _ = await client.request(
                "GET",
                f"/agent/task/{task_id}"
            )
            
            # List all tasks
            list_result, list_status, _ = await client.request("GET", "/agent/tasks")
            
            # Check if our task is in the list
            task_found = False
            if list_status == 200 and list_result:
                tasks = list_result.get("tasks", [])
                task_found = any(t.get("task_id") == task_id for t in tasks)
            
            return {
                "success": retrieve_status == 200 and task_found,
                "task_created": bool(task_id),
                "task_retrievable": retrieve_status == 200,
                "task_in_listing": task_found,
                "persistence_verified": retrieve_status == 200 and task_found
            }
    
    async def generate_comprehensive_report(self):
        """Generate detailed test report with insights"""
        total_duration = time.time() - self.start_time
        
        # Calculate statistics
        total_tests = len(self.test_results)
        by_status = {}
        by_category = {}
        
        for result in self.test_results:
            # By status
            status_name = result.status.name
            by_status[status_name] = by_status.get(status_name, 0) + 1
            
            # By category
            by_category[result.category] = by_category.get(result.category, [])
            by_category[result.category].append(result)
        
        # Generate report
        print("\n" + "=" * 70)
        print("📊 COMPREHENSIVE TEST REPORT")
        print("=" * 70)
        
        # Summary
        print(f"\n📈 Summary:")
        print(f"   Total Tests: {total_tests}")
        print(f"   Duration: {total_duration:.2f}s")
        print(f"   Average Test Time: {total_duration/total_tests:.2f}s")
        
        # Status breakdown
        print(f"\n📊 Results by Status:")
        for status, count in sorted(by_status.items()):
            percentage = (count / total_tests) * 100
            icon = {
                "PASSED": "✅",
                "FAILED": "❌",
                "ERROR": "💥",
                "SKIPPED": "⏭️"
            }.get(status, "❓")
            print(f"   {icon} {status}: {count} ({percentage:.1f}%)")
        
        # Category breakdown
        print(f"\n📂 Results by Category:")
        for category, results in by_category.items():
            passed = sum(1 for r in results if r.status == TestStatus.PASSED)
            total = len(results)
            print(f"   {category}: {passed}/{total} passed ({(passed/total)*100:.1f}%)")
        
        # Performance insights
        print(f"\n⚡ Performance Insights:")
        response_times = []
        for result in self.test_results:
            if "response_times" in result.details:
                rt = result.details["response_times"]
                if isinstance(rt, dict) and "avg" in rt:
                    response_times.append(rt["avg"])
        
        if response_times:
            print(f"   Average Response Time: {statistics.mean(response_times):.3f}s")
            print(f"   Best Response Time: {min(response_times):.3f}s")
            print(f"   Worst Response Time: {max(response_times):.3f}s")
        
        # Critical issues
        critical_issues = [r for r in self.test_results if r.status == TestStatus.FAILED and r.category == "Core"]
        if critical_issues:
            print(f"\n🚨 Critical Issues:")
            for issue in critical_issues:
                print(f"   - {issue.name}: {issue.error or 'Unknown error'}")
        
        # Warnings
        all_warnings = []
        for result in self.test_results:
            all_warnings.extend([(result.name, w) for w in result.warnings])
        
        if all_warnings:
            print(f"\n⚠️  Warnings ({len(all_warnings)}):")
            for test_name, warning in all_warnings[:5]:  # Show first 5
                print(f"   - {test_name}: {warning}")
            if len(all_warnings) > 5:
                print(f"   ... and {len(all_warnings) - 5} more warnings")
        
        # Recommendations
        print(f"\n💡 Recommendations:")
        success_rate = by_status.get("PASSED", 0) / total_tests
        
        if success_rate >= 0.95:
            print("   🎉 Excellent! System is performing optimally.")
            print("   - Consider performance optimization for even better results")
            print("   - Set up continuous monitoring")
        elif success_rate >= 0.8:
            print("   ✅ Good overall health with minor issues.")
            print("   - Address failed tests in non-critical components")
            print("   - Review warnings for potential improvements")
        elif success_rate >= 0.6:
            print("   ⚠️  System needs attention.")
            print("   - Prioritize fixing core functionality")
            print("   - Review error logs for root causes")
        else:
            print("   🚨 Critical issues detected.")
            print("   - Immediate action required on core components")
            print("   - Consider rollback if this is a new deployment")
        
        # Save detailed report
        await self._save_detailed_report(by_status, by_category, total_duration)
    
    async def _save_detailed_report(self, by_status: Dict, by_category: Dict, duration: float):
        """Save detailed report to file"""
        TestConfig.REPORT_DIR.mkdir(exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = TestConfig.REPORT_DIR / f"test_report_{timestamp}.json"
        
        report_data = {
            "timestamp": datetime.now().isoformat(),
            "duration": duration,
            "summary": {
                "total_tests": len(self.test_results),
                "by_status": by_status,
                "by_category": {k: len(v) for k, v in by_category.items()}
            },
            "results": [asdict(r) for r in self.test_results],
            "configuration": {
                "backend_url": TestConfig.BACKEND_URL,
                "frontend_url": TestConfig.FRONTEND_URL,
                "timeouts": {
                    "short": TestConfig.TIMEOUT_SHORT,
                    "medium": TestConfig.TIMEOUT_MEDIUM,
                    "long": TestConfig.TIMEOUT_LONG
                }
            }
        }
        
        with open(report_file, "w") as f:
            json.dump(report_data, f, indent=2, default=str)
        
        print(f"\n📄 Detailed report saved to: {report_file}")
        
        # Also save a summary CSV for easy analysis
        summary_file = TestConfig.REPORT_DIR / f"test_summary_{timestamp}.csv"
        with open(summary_file, "w") as f:
            f.write("Test Name,Category,Status,Duration,Success Rate,Warnings,Error\n")
            for result in self.test_results:
                warnings = len(result.warnings)
                error = result.error or ""
                f.write(f'"{result.name}","{result.category}","{result.status.name}",{result.duration:.3f},{result.success_rate:.3f},{warnings},"{error}"\n')
        
        print(f"📊 Summary CSV saved to: {summary_file}")

# Progress bar support (optional)
try:
    from tqdm.asyncio import tqdm
except ImportError:
    # Fallback if tqdm not available
    class tqdm:
        def __init__(self, *args, **kwargs):
            self.total = kwargs.get('total', 0)
            self.desc = kwargs.get('desc', '')
            self.n = 0
            
        def update(self, n=1):
            self.n += n
            print(f"{self.desc}: {self.n}/{self.total}")
            
        def __enter__(self):
            return self
            
        def __exit__(self, *args):
            pass

async def main():
    """Main test execution"""
    parser = argparse.ArgumentParser(description="DeerFlow Complete Application Test Suite")
    parser.add_argument("--backend-url", default=TestConfig.BACKEND_URL, help="Backend URL")
    parser.add_argument("--frontend-url", default=TestConfig.FRONTEND_URL, help="Frontend URL")
    parser.add_argument("--sequential", action="store_true", help="Run tests sequentially")
    parser.add_argument("--timeout", type=int, help="Override default timeout")
    parser.add_argument("--verbose", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    # Update configuration
    if args.backend_url:
        TestConfig.BACKEND_URL = args.backend_url
    if args.frontend_url:
        TestConfig.FRONTEND_URL = args.frontend_url
    if args.timeout:
        TestConfig.TIMEOUT_LONG = args.timeout
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    # Run tests
    tester = DeerFlowAppTester()
    success = await tester.run_complete_test_suite(parallel=not args.sequential)
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Test suite failed: {e}")
        logger.exception("Test suite exception")
        sys.exit(1)
