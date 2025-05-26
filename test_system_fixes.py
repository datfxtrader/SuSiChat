
#!/usr/bin/env python3
"""
Test script to verify system fixes
"""
import asyncio
import requests
import json
import time
import websocket
import threading
from typing import Dict, Any

class SystemFixesTest:
    def __init__(self):
        self.backend_url = "http://localhost:9000"
        self.frontend_url = "http://localhost:5173"
        self.results = []

    async def test_agent_task_creation(self) -> Dict[str, Any]:
        """Test agent task creation and ID return"""
        try:
            response = requests.post(
                f"{self.backend_url}/agent/research",
                json={
                    "research_question": "Test task ID generation",
                    "depth": "standard",
                    "include_reasoning": True
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                task_id = data.get("task_id")
                
                if task_id and task_id != "":
                    return {"success": True, "task_id": task_id, "message": "Task ID generated successfully"}
                else:
                    return {"success": False, "error": "No task ID returned"}
            else:
                return {"success": False, "error": f"HTTP {response.status_code}"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}

    def test_cors_configuration(self) -> Dict[str, Any]:
        """Test CORS configuration"""
        try:
            # Test OPTIONS preflight request
            response = requests.options(
                f"{self.backend_url}/health",
                headers={
                    "Origin": "http://localhost:5173",
                    "Access-Control-Request-Method": "GET"
                },
                timeout=5
            )
            
            cors_headers = {
                "access-control-allow-origin": response.headers.get("access-control-allow-origin"),
                "access-control-allow-methods": response.headers.get("access-control-allow-methods"),
                "access-control-allow-headers": response.headers.get("access-control-allow-headers")
            }
            
            if cors_headers["access-control-allow-origin"]:
                return {"success": True, "cors_headers": cors_headers}
            else:
                return {"success": False, "error": "CORS not properly configured"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}

    def test_websocket_connection(self) -> Dict[str, Any]:
        """Test WebSocket connection"""
        try:
            ws_url = f"ws://localhost:9000/ws"
            result = {"success": False, "error": "Not tested"}
            
            def on_message(ws, message):
                try:
                    data = json.loads(message)
                    if data.get("type") == "echo":
                        result["success"] = True
                        result["message"] = "WebSocket working"
                except:
                    pass

            def on_error(ws, error):
                result["error"] = str(error)

            def on_open(ws):
                ws.send(json.dumps({"test": "websocket connection"}))
                time.sleep(1)
                ws.close()

            ws = websocket.WebSocketApp(
                ws_url,
                on_message=on_message,
                on_error=on_error,
                on_open=on_open
            )
            
            # Run WebSocket in thread with timeout
            wst = threading.Thread(target=ws.run_forever)
            wst.daemon = True
            wst.start()
            wst.join(timeout=5)
            
            return result
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def test_data_persistence(self) -> Dict[str, Any]:
        """Test data persistence and task retrieval"""
        try:
            # First create a task
            create_response = requests.post(
                f"{self.backend_url}/agent/research",
                json={
                    "research_question": "Persistence test",
                    "depth": "standard"
                },
                timeout=10
            )
            
            if create_response.status_code != 200:
                return {"success": False, "error": "Could not create task"}
            
            task_id = create_response.json().get("task_id")
            if not task_id:
                return {"success": False, "error": "No task ID from creation"}
            
            # Wait a moment for task to be processed
            await asyncio.sleep(2)
            
            # Try to retrieve task status
            status_response = requests.get(
                f"{self.backend_url}/agent/task/{task_id}",
                timeout=10
            )
            
            if status_response.status_code == 200:
                status_data = status_response.json()
                if status_data and "task_id" in status_data:
                    return {
                        "success": True, 
                        "task_id": task_id,
                        "status": status_data.get("status"),
                        "message": "Task persistence working"
                    }
            
            return {"success": False, "error": "Could not retrieve task status"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    def test_susi_service(self) -> Dict[str, Any]:
        """Test SuSi service availability"""
        try:
            # Try common SuSi ports
            for port in [8000, 3000, 5000]:
                try:
                    response = requests.get(f"http://localhost:{port}/health", timeout=2)
                    if response.status_code == 200:
                        return {
                            "success": True, 
                            "port": port,
                            "message": f"SuSi service running on port {port}"
                        }
                except:
                    continue
            
            return {"success": False, "error": "SuSi service not found on common ports"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def run_all_tests(self):
        """Run all system tests"""
        print("🔧 Testing System Fixes")
        print("=" * 50)
        
        tests = [
            ("Agent Task Creation", self.test_agent_task_creation()),
            ("CORS Configuration", self.test_cors_configuration()),
            ("WebSocket Connection", self.test_websocket_connection()),
            ("Data Persistence", self.test_data_persistence()),
            ("SuSi Service", self.test_susi_service())
        ]
        
        for test_name, test_coro in tests:
            print(f"\n🧪 {test_name}...")
            
            if asyncio.iscoroutine(test_coro):
                result = await test_coro
            else:
                result = test_coro
            
            self.results.append({"test": test_name, **result})
            
            if result["success"]:
                print(f"   ✅ PASSED: {result.get('message', 'Test successful')}")
            else:
                print(f"   ❌ FAILED: {result.get('error', 'Unknown error')}")
        
        # Summary
        passed = sum(1 for r in self.results if r["success"])
        total = len(self.results)
        
        print(f"\n📊 Test Summary: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All system fixes are working!")
        else:
            print("⚠️  Some issues remain - check the failures above")

if __name__ == "__main__":
    tester = SystemFixesTest()
    asyncio.run(tester.run_all_tests())
