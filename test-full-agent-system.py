
#!/usr/bin/env python3
"""
Comprehensive test script for DeerFlow Full Agent System
Tests all advanced agent capabilities including multi-agent orchestration,
reasoning engine, domain expertise, and learning systems.
"""

import asyncio
import requests
import json
import time
from typing import Dict, Any

# DeerFlow service configuration
DEERFLOW_URL = "http://localhost:3000"

async def test_basic_health():
    """Test if DeerFlow service is healthy"""
    try:
        response = requests.get(f"{DEERFLOW_URL}/health", timeout=10)
        if response.status_code == 200:
            print("✅ DeerFlow service is healthy")
            return True
        else:
            print(f"❌ DeerFlow health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ DeerFlow service not accessible: {e}")
        return False

async def test_full_agent_capabilities():
    """Test DeerFlow full agent system capabilities"""
    try:
        response = requests.get(f"{DEERFLOW_URL}/deerflow/capabilities", timeout=10)
        if response.status_code == 200:
            capabilities = response.json()
            print("🔍 DeerFlow Capabilities:")
            print(f"   Service: {capabilities.get('service', 'Unknown')}")
            print(f"   Status: {capabilities.get('status', 'Unknown')}")
            
            caps = capabilities.get('capabilities', {})
            print("   Available Features:")
            for feature, available in caps.items():
                status = "✅" if available else "❌"
                print(f"   {status} {feature}")
            
            return caps.get('full_agent_system', False)
        else:
            print(f"❌ Capabilities check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Capabilities test failed: {e}")
        return False

async def test_agent_tools():
    """Test available agent tools"""
    try:
        response = requests.get(f"{DEERFLOW_URL}/deerflow/tools", timeout=10)
        if response.status_code == 200:
            tools_data = response.json()
            tool_count = tools_data.get('available_tools', 0)
            categories = tools_data.get('tool_categories', [])
            
            print(f"🛠️  Agent Tools Available: {tool_count}")
            print(f"   Tool Categories: {', '.join(categories)}")
            
            tools = tools_data.get('tools', {})
            if tools:
                print("   Registered Tools:")
                for tool_name, tool_info in list(tools.items())[:5]:  # Show first 5
                    print(f"   - {tool_name}: {tool_info.get('description', 'No description')}")
            
            return tool_count > 0
        else:
            print(f"❌ Tools test failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Tools test failed: {e}")
        return False

async def test_agent_research_creation():
    """Test creating an agent research task"""
    try:
        research_params = {
            "research_question": "Test multi-agent research capabilities with financial analysis",
            "depth": "comprehensive",
            "include_reasoning": True,
            "learning_mode": True,
            "preferences": {
                "enable_multi_agent": True,
                "enable_domain_expertise": True,
                "enable_reasoning_chains": True
            }
        }
        
        response = requests.post(
            f"{DEERFLOW_URL}/agent/research", 
            json=research_params, 
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            task_id = result.get('task_id', '')
            status = result.get('status', 'unknown')
            message = result.get('message', 'No message')
            
            print(f"🎯 Agent Research Task Created:")
            print(f"   Task ID: {task_id}")
            print(f"   Status: {status}")
            print(f"   Message: {message}")
            
            return task_id if status != 'error' else None
        else:
            print(f"❌ Agent research creation failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Agent research test failed: {e}")
        return None

async def test_full_deerflow_research():
    """Test the complete DeerFlow agent system"""
    try:
        research_params = {
            "research_question": "Analyze EUR/USD market trends with multi-agent approach",
            "user_id": "test_user",
            "complexity": "high",
            "enable_multi_agent": True,
            "enable_reasoning": True,
            "preferences": {
                "enable_domain_expertise": True,
                "enable_advanced_planning": True,
                "enable_reasoning_chains": True,
                "enable_learning_system": True
            }
        }
        
        print("🚀 Testing Full DeerFlow Agent System...")
        response = requests.post(
            f"{DEERFLOW_URL}/deerflow/full-research", 
            json=research_params, 
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            
            print("✅ Full DeerFlow Research Completed:")
            print(f"   Task ID: {result.get('task_id', 'N/A')}")
            print(f"   Status: {result.get('status', 'unknown')}")
            print(f"   Agent Capabilities: {result.get('agent_capabilities', 'N/A')}")
            print(f"   Execution Time: {result.get('execution_time', 0):.2f}s")
            
            # Check for advanced features
            if 'query_analysis' in result:
                analysis = result['query_analysis']
                print(f"   Query Complexity: {analysis.get('complexity', 'unknown')}")
                print(f"   Domains: {analysis.get('domains', [])}")
            
            if 'agent_team' in result:
                team = result['agent_team']
                print(f"   Agent Team Size: {len(team)} agents")
                print(f"   Team: {', '.join(team)}")
            
            return True
        else:
            print(f"❌ Full DeerFlow research failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data.get('message', 'Unknown error')}")
            except:
                print(f"   Response: {response.text[:200]}...")
            return False
    except Exception as e:
        print(f"❌ Full DeerFlow test failed: {e}")
        return False

async def test_learning_system():
    """Test the learning system capabilities"""
    try:
        response = requests.get(f"{DEERFLOW_URL}/agent/learning/summary", timeout=10)
        if response.status_code == 200:
            summary = response.json()
            print("🧠 Learning System Status:")
            if 'error' in summary:
                print(f"   ❌ Learning system not available: {summary['error']}")
                return False
            else:
                print("   ✅ Learning system active")
                return True
        else:
            print(f"❌ Learning system test failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Learning system test failed: {e}")
        return False

async def main():
    """Run comprehensive DeerFlow agent system tests"""
    print("🔧 DeerFlow Full Agent System Test Suite")
    print("=" * 50)
    
    results = {}
    
    # Test 1: Basic health
    print("\n1. Testing Basic Service Health...")
    results['health'] = await test_basic_health()
    
    if not results['health']:
        print("❌ DeerFlow service is not running. Please start it first.")
        return
    
    # Test 2: Capabilities
    print("\n2. Testing Agent Capabilities...")
    results['capabilities'] = await test_full_agent_capabilities()
    
    # Test 3: Tools
    print("\n3. Testing Agent Tools...")
    results['tools'] = await test_agent_tools()
    
    # Test 4: Agent research creation
    print("\n4. Testing Agent Research Creation...")
    task_id = await test_agent_research_creation()
    results['agent_research'] = task_id is not None
    
    # Test 5: Full DeerFlow system
    print("\n5. Testing Full DeerFlow Agent System...")
    results['full_system'] = await test_full_deerflow_research()
    
    # Test 6: Learning system
    print("\n6. Testing Learning System...")
    results['learning'] = await test_learning_system()
    
    # Summary
    print("\n" + "=" * 50)
    print("🎯 Test Results Summary:")
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, passed_test in results.items():
        status = "✅ PASS" if passed_test else "❌ FAIL"
        print(f"   {test_name}: {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All DeerFlow agent systems are fully activated!")
    elif passed >= total * 0.7:
        print("⚠️  Most systems working, some features may need activation")
    else:
        print("❌ Significant issues detected, agent system needs attention")

if __name__ == "__main__":
    asyncio.run(main())
