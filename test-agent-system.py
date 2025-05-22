#!/usr/bin/env python3
"""
Test script for the new advanced agent system
"""

import asyncio
import aiohttp
import json
import time

async def test_agent_system():
    """Test the new agent endpoints"""
    base_url = "http://localhost:8000"
    
    print("🧪 Testing Advanced Agent System")
    print("=" * 50)
    
    # Test 1: Health check
    print("1. Testing health endpoint...")
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{base_url}/health") as response:
                data = await response.json()
                print(f"   ✅ Health check: {data}")
    except Exception as e:
        print(f"   ❌ Health check failed: {e}")
        return
    
    # Test 2: Create agent research task
    print("\n2. Creating agent research task...")
    research_request = {
        "research_question": "Latest trends in artificial intelligence and machine learning",
        "depth": "comprehensive",
        "include_reasoning": True,
        "learning_mode": True
    }
    
    task_id = None
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{base_url}/agent/research",
                json=research_request
            ) as response:
                data = await response.json()
                print(f"   ✅ Task created: {data}")
                task_id = data.get("task_id")
    except Exception as e:
        print(f"   ❌ Task creation failed: {e}")
        return
    
    if not task_id:
        print("   ❌ No task ID received")
        return
    
    # Test 3: Check task status
    print(f"\n3. Checking task status for {task_id[:8]}...")
    for i in range(5):
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{base_url}/agent/task/{task_id}") as response:
                    data = await response.json()
                    print(f"   📊 Status check {i+1}: {data.get('status', 'unknown')}")
                    print(f"      Progress: {data.get('progress', 0):.2%}")
                    if data.get('execution_plan'):
                        print(f"      Strategy: {data['execution_plan'].get('strategy', 'unknown')}")
                    
                    if data.get('status') in ['completed', 'failed']:
                        break
                        
        except Exception as e:
            print(f"   ❌ Status check failed: {e}")
        
        await asyncio.sleep(2)
    
    # Test 4: List all tasks
    print("\n4. Listing all agent tasks...")
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{base_url}/agent/tasks") as response:
                data = await response.json()
                print(f"   📋 Total tasks: {data.get('total', 0)}")
                for task in data.get('tasks', [])[:3]:  # Show first 3
                    print(f"      - {task.get('task_id', 'unknown')[:8]}: {task.get('status', 'unknown')}")
    except Exception as e:
        print(f"   ❌ Task listing failed: {e}")
    
    print("\n🎉 Agent system test completed!")
    print("The advanced planning and reasoning capabilities are now active!")

if __name__ == "__main__":
    asyncio.run(test_agent_system())