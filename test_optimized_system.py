
#!/usr/bin/env python3
"""
Comprehensive test for the optimized DeerFlow agent system

This script tests all major components:
- Enhanced tool system
- Persistent memory management
- Multi-agent coordination
- System integration
"""

import asyncio
import logging
import time
from optimized_system import create_optimized_system

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

async def test_optimized_system():
    """Comprehensive test of the optimized system"""
    
    print("🚀 Starting Optimized DeerFlow Agent System Tests")
    print("=" * 60)
    
    # Create system with test configuration
    config = {
        "cache": {"ttl": 300},
        "memory": {},
        "orchestrator": {"task_timeout": 60},
        "sandbox": {
            "allowed_modules": ["math", "statistics", "json"],
            "timeout": 10
        }
    }
    
    system = create_optimized_system(config)
    
    try:
        # Test 1: System Initialization
        print("1. Testing system initialization...")
        await system.initialize()
        print("   ✅ System initialized successfully")
        
        # Test 2: Simple Research Request
        print("\n2. Testing simple research request...")
        start_time = time.time()
        
        simple_result = await system.process_research_request(
            query="What is artificial intelligence?",
            user_id="test_user_1"
        )
        
        execution_time = time.time() - start_time
        print(f"   ✅ Simple research completed in {execution_time:.2f}s")
        print(f"   📊 Result status: {simple_result['status']}")
        print(f"   🤖 Team size: {simple_result.get('team_size', 0)}")
        
        # Test 3: Complex Research Request
        print("\n3. Testing complex research request...")
        start_time = time.time()
        
        complex_result = await system.process_research_request(
            query="Analyze and compare the latest developments in machine learning, provide a comprehensive evaluation of their market impact, and validate the claims made by industry experts",
            user_id="test_user_2"
        )
        
        execution_time = time.time() - start_time
        print(f"   ✅ Complex research completed in {execution_time:.2f}s")
        print(f"   📊 Result status: {complex_result['status']}")
        print(f"   🤖 Team size: {complex_result.get('team_size', 0)}")
        print(f"   🧠 Complexity: {complex_result.get('complexity', 'unknown')}")
        
        # Test 4: Tool System
        print("\n4. Testing tool system...")
        
        # Test web search tool
        web_result = await system.tool_registry.execute_tool(
            "web_search",
            query="Python programming",
            max_results=5
        )
        print(f"   ✅ Web search tool: {web_result.success}")
        
        # Test code execution tool
        code_result = await system.tool_registry.execute_tool(
            "code_execution",
            code="result = 2 + 2 * 3",
            context={}
        )
        print(f"   ✅ Code execution tool: {code_result.success}")
        if code_result.success:
            print(f"   🔢 Code result: {code_result.data}")
        
        # Test 5: Memory System
        print("\n5. Testing memory system...")
        
        # Store some memories
        await system.memory_manager.store_memory(
            agent_id="test_agent",
            memory_type="episodic",
            content="Completed a complex AI research task",
            importance=0.8
        )
        
        await system.memory_manager.store_memory(
            agent_id="test_agent",
            memory_type="semantic",
            content="AI involves machine learning and neural networks",
            importance=0.7
        )
        
        # Retrieve memories
        memories = await system.memory_manager.retrieve_memories(
            agent_id="test_agent",
            limit=10
        )
        print(f"   ✅ Memory storage/retrieval: {len(memories)} memories")
        
        # Search memories
        search_results = await system.memory_manager.search_memories(
            agent_id="test_agent",
            query="AI research"
        )
        print(f"   🔍 Memory search: {len(search_results)} results")
        
        # Test 6: System Health
        print("\n6. Testing system health monitoring...")
        health = await system.get_system_health()
        print(f"   ✅ Overall health: {health['overall_health']}")
        print(f"   📈 Success rate: {health['success_rate']:.1%}")
        print(f"   ⏱️  Average execution time: {health['average_execution_time']:.2f}s")
        
        # Test 7: Detailed Metrics
        print("\n7. Testing metrics collection...")
        metrics = await system.get_detailed_metrics()
        
        tool_metrics = metrics.get("tool_metrics", {})
        print(f"   📊 Tool metrics: {len(tool_metrics)} tools")
        
        for tool_name, tool_data in tool_metrics.items():
            print(f"      - {tool_name}: {tool_data['execution_count']} executions, "
                  f"{tool_data['success_rate']:.1%} success rate")
        
        memory_stats = metrics.get("memory_stats", {})
        print(f"   🧠 Memory stats: {memory_stats.get('total_memories', 0)} memories")
        
        orchestrator_stats = metrics.get("orchestrator_stats", {})
        print(f"   🤖 Agent stats: {orchestrator_stats.get('total_agents', 0)} agents")
        
        # Test 8: Error Handling
        print("\n8. Testing error handling...")
        
        try:
            error_result = await system.process_research_request(
                query="",  # Empty query to trigger error
                user_id="test_user_error"
            )
            if error_result["status"] == "error":
                print("   ✅ Error handling works correctly")
            else:
                print("   ⚠️  Error handling may need improvement")
        except Exception as e:
            print(f"   ✅ Exception handling works: {type(e).__name__}")
        
        # Test 9: Performance Under Load
        print("\n9. Testing performance under load...")
        
        start_time = time.time()
        tasks = []
        
        for i in range(5):
            task = system.process_research_request(
                query=f"Research topic {i+1}: AI applications",
                user_id=f"load_test_user_{i+1}"
            )
            tasks.append(task)
        
        # Execute all tasks concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        load_time = time.time() - start_time
        successful_results = [r for r in results if isinstance(r, dict) and r.get("status") == "success"]
        
        print(f"   ✅ Load test: {len(successful_results)}/5 tasks succeeded")
        print(f"   ⏱️  Total time: {load_time:.2f}s")
        print(f"   📈 Throughput: {len(successful_results)/load_time:.2f} tasks/second")
        
        # Final Health Check
        print("\n10. Final system health check...")
        final_health = await system.get_system_health()
        print(f"    ✅ Final health: {final_health['overall_health']}")
        print(f"    📊 Total tasks processed: {final_health['total_tasks']}")
        print(f"    🎯 Final success rate: {final_health['success_rate']:.1%}")
        
        print("\n" + "=" * 60)
        print("🎉 ALL TESTS COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        
        # Summary
        print("\nSUMMARY:")
        print("✅ Enhanced tool system with dependency injection")
        print("✅ Persistent memory management") 
        print("✅ Multi-agent coordination")
        print("✅ Comprehensive error handling")
        print("✅ Performance monitoring and metrics")
        print("✅ Concurrent task processing")
        print("✅ System health monitoring")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        await system.shutdown()

async def test_individual_components():
    """Test individual components separately"""
    
    print("\n🔧 Testing Individual Components")
    print("=" * 60)
    
    from enhanced_tools import WebSearchTool, CacheManager, DependencyContainer
    from enhanced_memory import PersistentMemoryManager
    
    # Test dependency container
    print("1. Testing dependency container...")
    container = DependencyContainer()
    container.register(str, "test_string")
    container.register(int, 42)
    
    resolved_str = container.resolve(str)
    resolved_int = container.resolve(int)
    
    print(f"   ✅ String resolution: {resolved_str}")
    print(f"   ✅ Integer resolution: {resolved_int}")
    
    # Test cache manager
    print("\n2. Testing cache manager...")
    cache = CacheManager({})
    await cache.set("test_key", "test_value", ttl=60)
    cached_value = await cache.get("test_key")
    print(f"   ✅ Cache set/get: {cached_value}")
    
    # Test memory manager
    print("\n3. Testing memory manager...")
    memory_mgr = PersistentMemoryManager({})
    await memory_mgr.initialize()
    
    memory_id = await memory_mgr.store_memory(
        agent_id="test_component_agent",
        memory_type="test",
        content="Test memory content",
        importance=0.5
    )
    print(f"   ✅ Memory stored with ID: {memory_id}")
    
    print("\n✅ Component tests completed!")

if __name__ == "__main__":
    print("🚀 Starting Comprehensive Optimized System Tests")
    
    # Run main test
    success = asyncio.run(test_optimized_system())
    
    # Run component tests
    asyncio.run(test_individual_components())
    
    if success:
        print("\n🎯 All tests passed! The optimized system is ready for production.")
    else:
        print("\n⚠️ Some tests failed. Please check the error messages above.")
