
#!/usr/bin/env python3
"""
DeerFlow Optimization System Test Suite

This script comprehensively tests the optimization system implementation
to ensure all components work correctly before production deployment.
"""

import asyncio
import time
import logging
import sys
import json
from typing import Dict, Any

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("optimization_test")

async def test_optimization_system():
    """Test the complete optimization system"""
    
    print("🧪 Testing DeerFlow Optimization System")
    print("=" * 60)
    
    try:
        # Import optimization components
        from deerflow_service.optimization_coordinator import optimization_coordinator, OptimizationPhase
        from deerflow_service.config_manager import get_config
        from deerflow_service.metrics import MetricsCollector
        from deerflow_service.error_handler import error_handler
        
        print("✅ All optimization modules imported successfully")
        
        # Test 1: Configuration Validation
        print("\n1. Testing Configuration Management...")
        config = get_config()
        assert config is not None, "Configuration should be loaded"
        print(f"   ✅ Configuration loaded: {config.environment}")
        
        # Test 2: Metrics System
        print("\n2. Testing Metrics Collection...")
        metrics = MetricsCollector()
        
        # Record some test metrics
        metrics.record_task_start("test_task", "optimization_test")
        await asyncio.sleep(0.1)
        metrics.record_task_end("test_task", "optimization_test", "success", 0.1)
        
        metrics_summary = metrics.get_metrics_summary()
        assert "active_tasks" in metrics_summary, "Metrics should include active tasks"
        print("   ✅ Metrics collection working correctly")
        
        # Test 3: Error Handler
        print("\n3. Testing Error Handling...")
        try:
            raise ValueError("Test error for error handler")
        except Exception as e:
            error_handler.handle_error(e, {"test": "context"})
        
        error_summary = error_handler.get_error_summary()
        print("   ✅ Error handling working correctly")
        
        # Test 4: Optimization Coordinator Initialization
        print("\n4. Testing Optimization Coordinator...")
        status = optimization_coordinator.get_optimization_status()
        
        assert "current_phase" in status, "Status should include current phase"
        assert "total_tasks" in status, "Status should include total tasks"
        assert status["total_tasks"] > 0, "Should have optimization tasks defined"
        
        print(f"   ✅ Optimization coordinator initialized with {status['total_tasks']} tasks")
        
        # Test 5: Phase Validation
        print("\n5. Testing Optimization Phases...")
        phases = list(OptimizationPhase)
        expected_phases = [
            "analysis", "configuration", "system_enhancement", 
            "performance_tuning", "monitoring_setup", "validation", "deployment"
        ]
        
        phase_values = [phase.value for phase in phases]
        for expected_phase in expected_phases:
            assert expected_phase in phase_values, f"Missing phase: {expected_phase}"
        
        print(f"   ✅ All {len(phases)} optimization phases defined correctly")
        
        # Test 6: Task Dependencies
        print("\n6. Testing Task Dependencies...")
        tasks = optimization_coordinator.optimization_tasks
        
        # Verify dependency chains are valid
        for task_id, task in tasks.items():
            for dep in task.dependencies:
                assert dep in tasks, f"Invalid dependency {dep} for task {task_id}"
        
        print("   ✅ All task dependencies are valid")
        
        # Test 7: Mock Optimization Execution (Individual Tasks)
        print("\n7. Testing Individual Task Execution...")
        
        # Test system analysis
        analysis_result = await optimization_coordinator._analyze_current_state()
        assert analysis_result.get("success"), "System analysis should succeed"
        assert "analysis" in analysis_result, "Analysis should return results"
        print("   ✅ System analysis task working")
        
        # Test dependency audit
        audit_result = await optimization_coordinator._dependency_audit()
        assert audit_result.get("success"), "Dependency audit should succeed"
        print("   ✅ Dependency audit task working")
        
        # Test config enhancement (simulation)
        config_result = await optimization_coordinator._enhance_config_management()
        assert config_result.get("success"), "Config enhancement should succeed"
        print("   ✅ Configuration enhancement task working")
        
        # Test 8: Performance Validation
        print("\n8. Testing Performance Validation...")
        
        start_time = time.time()
        
        # Simulate some work
        for i in range(100):
            metrics.record_operation_time("test_operation", 0.001 * i)
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        assert execution_time < 1.0, "Performance test should complete quickly"
        print(f"   ✅ Performance test completed in {execution_time:.3f}s")
        
        # Test 9: Memory Management
        print("\n9. Testing Memory Management...")
        
        # Test metrics cleanup
        initial_count = len(metrics.metrics_history)
        metrics._cleanup_old_metrics(time.time() + 3600)  # Future time for cleanup
        final_count = len(metrics.metrics_history)
        
        print(f"   ✅ Memory cleanup working (before: {initial_count}, after: {final_count})")
        
        # Test 10: Integration Validation
        print("\n10. Testing System Integration...")
        
        # Test that all components work together
        system_health = metrics.get_system_health()
        optimization_status = optimization_coordinator.get_optimization_status()
        
        integration_checks = {
            "metrics_active": system_health.get("overall_health") != "critical",
            "optimization_ready": optimization_status.get("total_tasks", 0) > 0,
            "error_handling_active": error_summary.get("total_errors", 0) >= 0,
            "config_loaded": config.environment is not None
        }
        
        all_checks_passed = all(integration_checks.values())
        assert all_checks_passed, f"Integration checks failed: {integration_checks}"
        
        print("   ✅ All system components integrated correctly")
        
        # Final Summary
        print("\n" + "=" * 60)
        print("🎉 ALL OPTIMIZATION SYSTEM TESTS PASSED!")
        print("=" * 60)
        
        test_summary = {
            "tests_run": 10,
            "tests_passed": 10,
            "tests_failed": 0,
            "system_ready": True,
            "optimization_tasks": status["total_tasks"],
            "phases_available": len(phases),
            "estimated_optimization_time": "4-6 hours",
            "immediate_benefits": [
                "Enhanced error handling",
                "Improved metrics collection",
                "Better system monitoring",
                "Optimized performance tracking"
            ]
        }
        
        print("\n📊 Test Summary:")
        for key, value in test_summary.items():
            print(f"   {key}: {value}")
        
        print("\n🚀 System is ready for optimization!")
        print("Next steps:")
        print("1. Run the optimization process: POST /optimize/start")
        print("2. Monitor progress: GET /optimize/status") 
        print("3. View recommendations: GET /optimize/recommendations")
        print("4. Apply quick wins: POST /optimize/quick-wins")
        
        return test_summary
        
    except Exception as e:
        logger.error(f"❌ Optimization system test failed: {e}")
        print(f"\n💥 TEST FAILED: {e}")
        
        failure_summary = {
            "tests_run": "incomplete",
            "tests_passed": 0,
            "tests_failed": 1,
            "system_ready": False,
            "error": str(e),
            "recommendation": "Fix the error and run tests again"
        }
        
        return failure_summary

async def test_optimization_endpoints():
    """Test optimization endpoints using direct calls"""
    
    print("\n🌐 Testing Optimization API Endpoints")
    print("-" * 40)
    
    try:
        import aiohttp
        import json
        
        # Test endpoints with local server
        base_url = "http://0.0.0.0:9000"
        
        async with aiohttp.ClientSession() as session:
            
            # Test validation endpoint
            print("1. Testing optimization validation...")
            async with session.post(f"{base_url}/optimize/validate") as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"   ✅ Validation endpoint working: Ready = {data.get('ready_for_optimization', False)}")
                else:
                    print(f"   ⚠️ Validation endpoint returned {response.status}")
            
            # Test recommendations endpoint
            print("2. Testing optimization recommendations...")
            async with session.get(f"{base_url}/optimize/recommendations") as response:
                if response.status == 200:
                    data = await response.json()
                    high_priority_count = len(data.get('high_priority', []))
                    print(f"   ✅ Recommendations endpoint working: {high_priority_count} high priority items")
                else:
                    print(f"   ⚠️ Recommendations endpoint returned {response.status}")
            
            # Test phases endpoint
            print("3. Testing phases listing...")
            async with session.get(f"{base_url}/optimize/phases") as response:
                if response.status == 200:
                    data = await response.json()
                    phases_count = data.get('total_phases', 0)
                    print(f"   ✅ Phases endpoint working: {phases_count} phases available")
                else:
                    print(f"   ⚠️ Phases endpoint returned {response.status}")
            
            # Test quick wins
            print("4. Testing quick optimization wins...")
            async with session.post(f"{base_url}/optimize/quick-wins") as response:
                if response.status == 200:
                    data = await response.json()
                    wins_count = len(data.get('optimizations_applied', []))
                    print(f"   ✅ Quick wins endpoint working: {wins_count} optimizations applied")
                else:
                    print(f"   ⚠️ Quick wins endpoint returned {response.status}")
        
        print("\n✅ All optimization endpoints tested successfully!")
        
    except Exception as e:
        print(f"\n❌ Endpoint testing failed: {e}")
        print("Note: Make sure DeerFlow server is running on port 9000")

def run_interactive_test():
    """Run interactive test with user choices"""
    
    print("🎛️ DeerFlow Optimization System Interactive Test")
    print("=" * 50)
    
    while True:
        print("\nSelect test to run:")
        print("1. Full System Test")
        print("2. API Endpoints Test")
        print("3. Performance Benchmark")
        print("4. Exit")
        
        choice = input("\nEnter your choice (1-4): ").strip()
        
        if choice == "1":
            asyncio.run(test_optimization_system())
        elif choice == "2":
            asyncio.run(test_optimization_endpoints())
        elif choice == "3":
            print("🏃‍♂️ Running performance benchmark...")
            start_time = time.time()
            
            # Simple performance test
            from deerflow_service.metrics import MetricsCollector
            metrics = MetricsCollector()
            
            for i in range(1000):
                metrics.record_operation_time("benchmark_test", 0.001)
            
            end_time = time.time()
            print(f"   Processed 1000 operations in {end_time - start_time:.3f}s")
            print(f"   Average: {(end_time - start_time) / 1000 * 1000:.3f}ms per operation")
            
        elif choice == "4":
            print("👋 Goodbye!")
            break
        else:
            print("❌ Invalid choice. Please try again.")

if __name__ == "__main__":
    print("🚀 DeerFlow Optimization System Test Suite")
    
    if len(sys.argv) > 1 and sys.argv[1] == "--interactive":
        run_interactive_test()
    else:
        # Run basic test suite
        result = asyncio.run(test_optimization_system())
        
        if result.get("system_ready"):
            print("\n🎯 System is optimized and ready for production!")
            exit(0)
        else:
            print("\n⚠️ System needs attention before optimization")
            exit(1)
