
#!/usr/bin/env python3
"""
Frontend Functionality Test Suite

Tests the React frontend components and integration with the backend.
"""

import requests
import json
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("frontend_test")

class FrontendTester:
    """Frontend functionality tester"""
    
    def __init__(self):
        self.frontend_url = "http://0.0.0.0:5000"
        self.backend_url = "http://0.0.0.0:9000"
        self.driver = None
    
    def setup_browser(self):
        """Setup headless browser for testing"""
        try:
            chrome_options = Options()
            chrome_options.add_argument("--headless")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            
            self.driver = webdriver.Chrome(options=chrome_options)
            return True
        except Exception as e:
            logger.error(f"Could not setup browser: {e}")
            return False
    
    def test_frontend_loading(self):
        """Test if frontend loads properly"""
        try:
            if not self.driver:
                return {"success": False, "error": "Browser not available"}
            
            self.driver.get(self.frontend_url)
            
            # Wait for page to load
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            
            # Check if React app loaded
            page_title = self.driver.title
            page_source = self.driver.page_source
            
            react_loaded = "react" in page_source.lower() or len(page_source) > 1000
            
            return {
                "success": react_loaded,
                "page_title": page_title,
                "page_loaded": True,
                "react_app_detected": react_loaded
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def test_navigation(self):
        """Test frontend navigation"""
        try:
            if not self.driver:
                return {"success": False, "error": "Browser not available"}
            
            # Test navigation to different pages
            pages_to_test = [
                "/research-agent",
                "/chat", 
                "/schedule",
                "/family-room"
            ]
            
            successful_navigations = 0
            
            for page in pages_to_test:
                try:
                    self.driver.get(f"{self.frontend_url}{page}")
                    time.sleep(2)  # Wait for page load
                    
                    # Check if page loaded (basic check)
                    if "error" not in self.driver.page_source.lower():
                        successful_navigations += 1
                except:
                    pass
            
            success_rate = successful_navigations / len(pages_to_test)
            
            return {
                "success": success_rate >= 0.5,  # 50% success rate
                "successful_navigations": successful_navigations,
                "total_pages": len(pages_to_test),
                "success_rate": success_rate
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def test_research_interface(self):
        """Test research agent interface"""
        try:
            if not self.driver:
                return {"success": False, "error": "Browser not available"}
            
            # Navigate to research agent page
            self.driver.get(f"{self.frontend_url}/research-agent")
            time.sleep(3)
            
            # Look for research interface elements
            elements_found = {}
            
            # Check for input field
            try:
                input_field = self.driver.find_element(By.CSS_SELECTOR, "input, textarea")
                elements_found["input_field"] = True
            except:
                elements_found["input_field"] = False
            
            # Check for submit button
            try:
                submit_button = self.driver.find_element(By.CSS_SELECTOR, "button")
                elements_found["submit_button"] = True
            except:
                elements_found["submit_button"] = False
            
            # Check for research results area
            try:
                results_area = self.driver.find_element(By.CSS_SELECTOR, "[class*='result'], [class*='response']")
                elements_found["results_area"] = True
            except:
                elements_found["results_area"] = False
            
            interface_complete = sum(elements_found.values()) >= 2
            
            return {
                "success": interface_complete,
                "elements_found": elements_found,
                "interface_complete": interface_complete
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def cleanup(self):
        """Cleanup browser resources"""
        if self.driver:
            self.driver.quit()
    
    def run_frontend_tests(self):
        """Run all frontend tests"""
        print("🌐 Testing Frontend Functionality")
        print("=" * 40)
        
        # Setup browser
        if not self.setup_browser():
            print("⚠️ Browser testing not available (Selenium/Chrome not installed)")
            print("Falling back to basic HTTP tests...")
            return self.run_basic_frontend_tests()
        
        try:
            # Test frontend loading
            print("\n1. Testing frontend loading...")
            loading_result = self.test_frontend_loading()
            if loading_result["success"]:
                print("   ✅ Frontend loads successfully")
            else:
                print(f"   ❌ Frontend loading failed: {loading_result.get('error', 'Unknown')}")
            
            # Test navigation
            print("\n2. Testing navigation...")
            nav_result = self.test_navigation()
            if nav_result["success"]:
                print(f"   ✅ Navigation working ({nav_result['successful_navigations']}/{nav_result['total_pages']} pages)")
            else:
                print(f"   ❌ Navigation issues detected")
            
            # Test research interface
            print("\n3. Testing research interface...")
            research_result = self.test_research_interface()
            if research_result["success"]:
                print("   ✅ Research interface elements present")
            else:
                print("   ❌ Research interface incomplete")
            
            # Overall assessment
            total_tests = 3
            passed_tests = sum([
                loading_result["success"],
                nav_result["success"], 
                research_result["success"]
            ])
            
            print(f"\n📊 Frontend Test Results: {passed_tests}/{total_tests} passed")
            
            return {
                "success": passed_tests >= 2,
                "total_tests": total_tests,
                "passed_tests": passed_tests,
                "detailed_results": {
                    "loading": loading_result,
                    "navigation": nav_result,
                    "research_interface": research_result
                }
            }
            
        finally:
            self.cleanup()
    
    def run_basic_frontend_tests(self):
        """Run basic HTTP-based frontend tests"""
        
        try:
            # Test if frontend is serving content
            response = requests.get(self.frontend_url, timeout=10)
            frontend_accessible = response.status_code == 200
            
            print(f"   Frontend HTTP status: {response.status_code}")
            print(f"   Frontend accessible: {frontend_accessible}")
            
            # Test static assets
            asset_tests = []
            common_assets = ["/favicon.ico", "/manifest.json"]
            
            for asset in common_assets:
                try:
                    asset_response = requests.get(f"{self.frontend_url}{asset}", timeout=5)
                    asset_tests.append(asset_response.status_code in [200, 404])  # 404 is acceptable
                except:
                    asset_tests.append(False)
            
            assets_loading = sum(asset_tests) / len(asset_tests) if asset_tests else 0
            
            return {
                "success": frontend_accessible,
                "frontend_accessible": frontend_accessible,
                "assets_loading_rate": assets_loading,
                "note": "Basic HTTP tests only (browser testing not available)"
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}

def main():
    """Main frontend test execution"""
    
    tester = FrontendTester()
    result = tester.run_frontend_tests()
    
    if result["success"]:
        print("\n✅ Frontend functionality test PASSED")
        return True
    else:
        print("\n❌ Frontend functionality test FAILED")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
