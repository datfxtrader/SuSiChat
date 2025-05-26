
#!/usr/bin/env python3
"""
Optimized test script for the advanced agent system with comprehensive testing capabilities
"""
import asyncio
import aiohttp
import json
import time
import argparse
import sys
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
import logging
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
class Config:
    BASE_URL = "http://0.0.0.0:9000"
    TIMEOUT = aiohttp.ClientTimeout(total=30, connect=5)
    MAX_RETRIES = 3
    RETRY_DELAY = 1.0
    STATUS_CHECK_INTERVAL = 2.0
    MAX_STATUS_CHECKS = 30  # Max 1 minute of checking
    
class TaskStatus(Enum):
    PENDING = "pending"
    PLANNING = "planning"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class TestResult:
    test_name: str
    success: bool
    duration: float
    details: Dict[str, Any]
    error: Optional[str] = None

class AgentSystemTester:
    def __init__(self, base_url: str = Config.BASE_URL):
        self.base_url = base_url.rstrip('/')
        self.session: Optional[aiohttp.ClientSession] = None
        self.test_results: List[TestResult] = []
        
    @asynccontextmanager
    async def get_session(self):
        """Context manager for aiohttp session with retry logic"""
        if self.session is None:
            connector = aiohttp.TCPConnector(limit=10, force_close=True)
            self.session = aiohttp.ClientSession(
                timeout=Config.TIMEOUT,
                connector=connector,
                headers={'Content-Type': 'application/json'}
            )
        try:
            yield self.session
        except Exception as e:
            logger.error(f"Session error: {e}")
            raise
    
    async def make_request(
        self, 
        method: str, 
        endpoint: str, 
        **kwargs
    ) -> Tuple[Optional[Dict], int]:
        """Make HTTP request with retry logic"""
        url = f"{self.base_url}{endpoint}"
        last_error = None
        
        for attempt in range(Config.MAX_RETRIES):
            try:
                async with self.get_session() as session:
                    async with session.request(method, url, **kwargs) as response:
                        data = await response.json() if response.content_type == 'application/json' else None
                        return data, response.status
            except aiohttp.ClientError as e:
                last_error = e
                if attempt < Config.MAX_RETRIES - 1:
                    await asyncio.sleep(Config.RETRY_DELAY * (attempt + 1))
                    logger.warning(f"Retry {attempt + 1}/{Config.MAX_RETRIES} for {url}")
            except Exception as e:
                logger.error(f"Unexpected error: {e}")
                return None, 0
        
        logger.error(f"All retries failed for {url}: {last_error}")
        return None, 0
    
    async def test_health_check(self) -> TestResult:
        """Test health endpoint"""
        start_time = time.time()
        test_name = "Health Check"
        
        try:
            data, status = await self.make_request("GET", "/health")
            success = status == 200 and data is not None
            
            return TestResult(
                test_name=test_name,
                success=success,
                duration=time.time() - start_time,
                details={"response": data, "status": status}
            )
        except Exception as e:
            return TestResult(
                test_name=test_name,
                success=False,
                duration=time.time() - start_time,
                details={},
                error=str(e)
            )
    
    async def test_create_research_task(
        self, 
        research_question: str,
        depth: str = "comprehensive",
        include_reasoning: bool = True
    ) -> TestResult:
        """Test creating an agent research task"""
        start_time = time.time()
        test_name = "Create Research Task"
        
        request_data = {
            "research_question": research_question,
            "depth": depth,
            "include_reasoning": include_reasoning,
            "learning_mode": True,
            "preferences": {
                "focus_areas": ["latest developments", "practical applications"],
                "output_format": "detailed_report"
            }
        }
        
        try:
            data, status = await self.make_request(
                "POST", 
                "/agent/research", 
                json=request_data
            )
            
            success = status == 200 and data and "task_id" in data
            task_id = data.get("task_id") if data else None
            
            return TestResult(
                test_name=test_name,
                success=success,
                duration=time.time() - start_time,
                details={
                    "task_id": task_id,
                    "response": data,
                    "status": status
                }
            )
        except Exception as e:
            return TestResult(
                test_name=test_name,
                success=False,
                duration=time.time() - start_time,
                details={},
                error=str(e)
            )
    
    async def test_monitor_task_progress(self, task_id: str) -> TestResult:
        """Monitor task progress until completion"""
        start_time = time.time()
        test_name = "Monitor Task Progress"
        progress_history = []
        final_status = None
        
        try:
            for check_num in range(Config.MAX_STATUS_CHECKS):
                data, status = await self.make_request("GET", f"/agent/task/{task_id}")
                
                if status != 200 or not data:
                    continue
                
                current_status = data.get("status", "unknown")
                progress = data.get("progress", 0)
                
                progress_entry = {
                    "check": check_num + 1,
                    "time": time.time() - start_time,
                    "status": current_status,
                    "progress": progress,
                    "current_step": data.get("current_step"),
                    "processing_time": data.get("processing_time", 0)
                }
                
                # Add execution plan details if available
                if data.get("execution_plan"):
                    progress_entry["strategy"] = data["execution_plan"].get("strategy")
                    progress_entry["total_steps"] = len(data["execution_plan"].get("steps", []))
                
                progress_history.append(progress_entry)
                
                # Log progress
                logger.info(
                    f"Task {task_id[:8]} - Status: {current_status}, "
                    f"Progress: {progress:.1%}, Time: {progress_entry['time']:.1f}s"
                )
                
                if current_status in [TaskStatus.COMPLETED.value, TaskStatus.FAILED.value]:
                    final_status = current_status
                    break
                
                await asyncio.sleep(Config.STATUS_CHECK_INTERVAL)
            
            success = final_status == TaskStatus.COMPLETED.value
            
            return TestResult(
                test_name=test_name,
                success=success,
                duration=time.time() - start_time,
                details={
                    "final_status": final_status,
                    "progress_history": progress_history,
                    "total_checks": len(progress_history)
                }
            )
        except Exception as e:
            return TestResult(
                test_name=test_name,
                success=False,
                duration=time.time() - start_time,
                details={"progress_history": progress_history},
                error=str(e)
            )
    
    async def test_list_tasks(self, limit: int = 10) -> TestResult:
        """Test listing all agent tasks"""
        start_time = time.time()
        test_name = "List Tasks"
        
        try:
            data, status = await self.make_request("GET", f"/agent/tasks?limit={limit}")
            
            success = status == 200 and data is not None
            tasks = data.get("tasks", []) if data else []
            
            # Analyze task statistics
            task_stats = {
                "total": data.get("total", 0) if data else 0,
                "by_status": {}
            }
            
            for task in tasks:
                task_status = task.get("status", "unknown")
                task_stats["by_status"][task_status] = task_stats["by_status"].get(task_status, 0) + 1
            
            return TestResult(
                test_name=test_name,
                success=success,
                duration=time.time() - start_time,
                details={
                    "task_count": len(tasks),
                    "statistics": task_stats,
                    "sample_tasks": tasks[:3]  # First 3 tasks as sample
                }
            )
        except Exception as e:
            return TestResult(
                test_name=test_name,
                success=False,
                duration=time.time() - start_time,
                details={},
                error=str(e)
            )
    
    async def test_cleanup_tasks(self, max_age_hours: int = 24) -> TestResult:
        """Test cleanup of old tasks"""
        start_time = time.time()
        test_name = "Cleanup Tasks"
        
        try:
            data, status = await self.make_request(
                "POST",
                "/agent/cleanup",
                json={"max_age_hours": max_age_hours}
            )
            
            success = status == 200 and data is not None
            
            return TestResult(
                test_name=test_name,
                success=success,
                duration=time.time() - start_time,
                details=data or {}
            )
        except Exception as e:
            return TestResult(
                test_name=test_name,
                success=False,
                duration=time.time() - start_time,
                details={},
                error=str(e)
            )
    
    def print_results(self):
        """Print formatted test results"""
        print("\n" + "=" * 70)
        print("🧪 AGENT SYSTEM TEST RESULTS")
        print("=" * 70)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r.success)
        total_duration = sum(r.duration for r in self.test_results)
        
        # Summary
        print(f"\n📊 Summary:")
        print(f"   Total Tests: {total_tests}")
        print(f"   Passed: {passed_tests}")
        print(f"   Failed: {total_tests - passed_tests}")
        print(f"   Success Rate: {(passed_tests/total_tests*100):.1f}%")
        print(f"   Total Duration: {total_duration:.2f}s")
        
        # Detailed results
        print(f"\n📋 Detailed Results:")
        for i, result in enumerate(self.test_results, 1):
            status_icon = "✅" if result.success else "❌"
            print(f"\n{i}. {result.test_name} {status_icon}")
            print(f"   Duration: {result.duration:.2f}s")
            
            if result.error:
                print(f"   Error: {result.error}")
            
            # Print relevant details
            if result.test_name == "Health Check":
                if result.details.get("response"):
                    print(f"   Response: {result.details['response']}")
            
            elif result.test_name == "Create Research Task":
                if result.details.get("task_id"):
                    print(f"   Task ID: {result.details['task_id']}")
            
            elif result.test_name == "Monitor Task Progress":
                history = result.details.get("progress_history", [])
                if history:
                    final = history[-1]
                    print(f"   Final Status: {final.get('status')}")
                    print(f"   Total Time: {final.get('time', 0):.1f}s")
                    print(f"   Progress Steps: {len(history)}")
            
            elif result.test_name == "List Tasks":
                stats = result.details.get("statistics", {})
                print(f"   Total Tasks: {stats.get('total', 0)}")
                if stats.get("by_status"):
                    print("   Tasks by Status:")
                    for status, count in stats["by_status"].items():
                        print(f"     - {status}: {count}")
    
    async def run_all_tests(self, research_question: Optional[str] = None):
        """Run all tests in sequence"""
        if not research_question:
            research_question = "What are the latest trends in artificial intelligence and machine learning in 2024?"
        
        print(f"🚀 Starting Agent System Tests")
        print(f"   Target: {self.base_url}")
        print(f"   Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        try:
            # Test 1: Health check
            print("\n1️⃣  Testing health endpoint...")
            result = await self.test_health_check()
            self.test_results.append(result)
            
            if not result.success:
                print("   ⚠️  Health check failed, stopping tests")
                return
            
            # Test 2: Create research task
            print("\n2️⃣  Creating agent research task...")
            result = await self.test_create_research_task(research_question)
            self.test_results.append(result)
            
            task_id = result.details.get("task_id")
            if result.success and task_id:
                # Test 3: Monitor progress
                print(f"\n3️⃣  Monitoring task progress for {task_id[:8]}...")
                result = await self.test_monitor_task_progress(task_id)
                self.test_results.append(result)
            
            # Test 4: List tasks
            print("\n4️⃣  Listing all agent tasks...")
            result = await self.test_list_tasks()
            self.test_results.append(result)
            
            # Test 5: Cleanup (optional)
            if "--cleanup" in sys.argv:
                print("\n5️⃣  Testing cleanup functionality...")
                result = await self.test_cleanup_tasks(max_age_hours=1)
                self.test_results.append(result)
            
        finally:
            if self.session:
                await self.session.close()
        
        # Print results
        self.print_results()

async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Test the advanced agent system")
    parser.add_argument(
        "--url", 
        default=Config.BASE_URL,
        help="Base URL of the agent system"
    )
    parser.add_argument(
        "--question",
        default=None,
        help="Custom research question to test"
    )
    parser.add_argument(
        "--cleanup",
        action="store_true",
        help="Include cleanup test"
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging"
    )
    
    args = parser.parse_args()
    
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    tester = AgentSystemTester(args.url)
    await tester.run_all_tests(args.question)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Test failed with error: {e}")
        sys.exit(1)
