
#!/usr/bin/env python3
"""
Homework Functionality Test Suite
Tests the homework help system functionality
"""

import requests
import json
import time
import sys
import os
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:5000"
API_BASE = f"{BASE_URL}/api"

class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_colored(text, color):
    print(f"{color}{text}{Colors.ENDC}")

def print_test_result(test_name, success, details=""):
    status = "✅ PASS" if success else "❌ FAIL"
    color = Colors.OKGREEN if success else Colors.FAIL
    print_colored(f"{status} {test_name}", color)
    if details:
        print(f"   {details}")

class HomeworkTester:
    def __init__(self):
        self.session = requests.Session()
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "tests": {},
            "summary": {}
        }
        
        # Set up authentication headers
        self.session.headers.update({
            'Content-Type': 'application/json',
            'X-User-Id': 'test-user-123',
            'X-User-Email': 'test@example.com'
        })

    def test_homework_api_endpoint(self):
        """Test basic homework API endpoint"""
        print_colored("\n🧪 Testing Homework API Endpoint...", Colors.HEADER)
        
        test_data = {
            "question": "What is 2 + 2?",
            "subject": "math",
            "difficulty": "elementary",
            "userId": "test-user-123"
        }
        
        try:
            response = self.session.post(f"{API_BASE}/homework/help", json=test_data)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                success = data.get('success', False) and 'response' in data
                
            self.results["tests"]["homework_api_basic"] = {
                "success": success,
                "status_code": response.status_code,
                "response_time": response.elapsed.total_seconds()
            }
            
            print_test_result("Basic Homework API", success, 
                            f"Status: {response.status_code}, Time: {response.elapsed.total_seconds():.2f}s")
            return success
            
        except Exception as e:
            print_test_result("Basic Homework API", False, f"Error: {str(e)}")
            self.results["tests"]["homework_api_basic"] = {
                "success": False,
                "error": str(e)
            }
            return False

    def test_homework_subjects(self):
        """Test different homework subjects"""
        print_colored("\n📚 Testing Different Subjects...", Colors.HEADER)
        
        subjects = [
            {"id": "math", "question": "Solve for x: 2x + 5 = 11"},
            {"id": "science", "question": "What is photosynthesis?"},
            {"id": "english", "question": "What is a metaphor?"},
            {"id": "history", "question": "When did World War II end?"}
        ]
        
        results = []
        for subject in subjects:
            test_data = {
                "question": subject["question"],
                "subject": subject["id"],
                "difficulty": "middle",
                "userId": "test-user-123"
            }
            
            try:
                response = self.session.post(f"{API_BASE}/homework/help", json=test_data)
                success = response.status_code == 200
                
                if success:
                    data = response.json()
                    success = data.get('success', False)
                    
                results.append(success)
                print_test_result(f"Subject: {subject['id']}", success)
                
            except Exception as e:
                results.append(False)
                print_test_result(f"Subject: {subject['id']}", False, f"Error: {str(e)}")
        
        overall_success = all(results)
        self.results["tests"]["homework_subjects"] = {
            "success": overall_success,
            "individual_results": dict(zip([s["id"] for s in subjects], results))
        }
        
        return overall_success

    def test_homework_difficulty_levels(self):
        """Test different difficulty levels"""
        print_colored("\n🎯 Testing Difficulty Levels...", Colors.HEADER)
        
        difficulties = ["elementary", "middle", "high", "college"]
        results = []
        
        for difficulty in difficulties:
            test_data = {
                "question": "What is gravity?",
                "subject": "science",
                "difficulty": difficulty,
                "userId": "test-user-123"
            }
            
            try:
                response = self.session.post(f"{API_BASE}/homework/help", json=test_data)
                success = response.status_code == 200
                
                if success:
                    data = response.json()
                    success = data.get('success', False)
                    
                results.append(success)
                print_test_result(f"Difficulty: {difficulty}", success)
                
            except Exception as e:
                results.append(False)
                print_test_result(f"Difficulty: {difficulty}", False, f"Error: {str(e)}")
        
        overall_success = all(results)
        self.results["tests"]["homework_difficulties"] = {
            "success": overall_success,
            "individual_results": dict(zip(difficulties, results))
        }
        
        return overall_success

    def test_homework_validation(self):
        """Test input validation"""
        print_colored("\n✅ Testing Input Validation...", Colors.HEADER)
        
        test_cases = [
            {
                "name": "Missing question",
                "data": {"subject": "math", "difficulty": "elementary"},
                "should_fail": True
            },
            {
                "name": "Missing subject",
                "data": {"question": "What is 2+2?", "difficulty": "elementary"},
                "should_fail": True
            },
            {
                "name": "Missing difficulty",
                "data": {"question": "What is 2+2?", "subject": "math"},
                "should_fail": True
            },
            {
                "name": "Valid complete data",
                "data": {"question": "What is 2+2?", "subject": "math", "difficulty": "elementary"},
                "should_fail": False
            }
        ]
        
        results = []
        for test_case in test_cases:
            try:
                response = self.session.post(f"{API_BASE}/homework/help", json=test_case["data"])
                
                if test_case["should_fail"]:
                    success = response.status_code == 400
                else:
                    success = response.status_code == 200
                    
                results.append(success)
                print_test_result(test_case["name"], success)
                
            except Exception as e:
                results.append(False)
                print_test_result(test_case["name"], False, f"Error: {str(e)}")
        
        overall_success = all(results)
        self.results["tests"]["homework_validation"] = {
            "success": overall_success,
            "individual_results": {tc["name"]: r for tc, r in zip(test_cases, results)}
        }
        
        return overall_success

    def test_homework_response_quality(self):
        """Test response quality and format"""
        print_colored("\n🎨 Testing Response Quality...", Colors.HEADER)
        
        test_data = {
            "question": "Explain the water cycle",
            "subject": "science",
            "difficulty": "middle",
            "userId": "test-user-123"
        }
        
        try:
            response = self.session.post(f"{API_BASE}/homework/help", json=test_data)
            success = response.status_code == 200
            
            quality_checks = {
                "has_response": False,
                "response_length": False,
                "educational_content": False
            }
            
            if success:
                data = response.json()
                if data.get('success') and 'response' in data:
                    response_text = data['response']
                    
                    # Check response quality
                    quality_checks["has_response"] = bool(response_text)
                    quality_checks["response_length"] = len(response_text) > 50
                    quality_checks["educational_content"] = any(word in response_text.lower() 
                                                             for word in ['step', 'process', 'because', 'example'])
            
            overall_success = all(quality_checks.values())
            
            self.results["tests"]["homework_response_quality"] = {
                "success": overall_success,
                "quality_checks": quality_checks
            }
            
            print_test_result("Response Quality", overall_success, 
                            f"Checks: {sum(quality_checks.values())}/{len(quality_checks)}")
            return overall_success
            
        except Exception as e:
            print_test_result("Response Quality", False, f"Error: {str(e)}")
            self.results["tests"]["homework_response_quality"] = {
                "success": False,
                "error": str(e)
            }
            return False

    def test_homework_performance(self):
        """Test homework system performance"""
        print_colored("\n⚡ Testing Performance...", Colors.HEADER)
        
        test_data = {
            "question": "What is photosynthesis?",
            "subject": "science",
            "difficulty": "middle",
            "userId": "test-user-123"
        }
        
        response_times = []
        success_count = 0
        
        for i in range(3):
            try:
                start_time = time.time()
                response = self.session.post(f"{API_BASE}/homework/help", json=test_data)
                end_time = time.time()
                
                response_time = end_time - start_time
                response_times.append(response_time)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success'):
                        success_count += 1
                        
            except Exception as e:
                print(f"Performance test {i+1} failed: {str(e)}")
        
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        success_rate = success_count / 3
        
        performance_good = avg_response_time < 10.0 and success_rate >= 0.8
        
        self.results["tests"]["homework_performance"] = {
            "success": performance_good,
            "avg_response_time": avg_response_time,
            "success_rate": success_rate,
            "individual_times": response_times
        }
        
        print_test_result("Performance", performance_good, 
                        f"Avg time: {avg_response_time:.2f}s, Success rate: {success_rate:.1%}")
        return performance_good

    def run_all_tests(self):
        """Run all homework tests"""
        print_colored("🚀 Starting Homework Functionality Test Suite", Colors.BOLD)
        print_colored("=" * 60, Colors.HEADER)
        
        tests = [
            self.test_homework_api_endpoint,
            self.test_homework_subjects,
            self.test_homework_difficulty_levels,
            self.test_homework_validation,
            self.test_homework_response_quality,
            self.test_homework_performance
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
            time.sleep(0.5)  # Small delay between tests
        
        # Generate summary
        self.results["summary"] = {
            "total_tests": total,
            "passed": passed,
            "failed": total - passed,
            "success_rate": passed / total,
            "overall_success": passed == total
        }
        
        # Print summary
        print_colored("\n" + "=" * 60, Colors.HEADER)
        print_colored("📊 TEST SUMMARY", Colors.BOLD)
        print_colored("=" * 60, Colors.HEADER)
        
        print(f"Total Tests: {total}")
        print_colored(f"Passed: {passed}", Colors.OKGREEN)
        print_colored(f"Failed: {total - passed}", Colors.FAIL if total - passed > 0 else Colors.OKGREEN)
        print(f"Success Rate: {passed/total:.1%}")
        
        if passed == total:
            print_colored("🎉 All homework tests passed!", Colors.OKGREEN)
        else:
            print_colored("⚠️  Some homework tests failed", Colors.WARNING)
        
        # Save results
        with open('homework_test_results.json', 'w') as f:
            json.dump(self.results, f, indent=2)
        
        return passed == total

def main():
    print_colored("🔧 Homework System Test Suite", Colors.BOLD)
    
    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/api/auth/user", timeout=5)
        print_colored("✅ Server is running", Colors.OKGREEN)
    except requests.exceptions.RequestException:
        print_colored("❌ Server is not running or not accessible", Colors.FAIL)
        print("Please start the server with 'npm run dev' first")
        return False
    
    tester = HomeworkTester()
    success = tester.run_all_tests()
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
