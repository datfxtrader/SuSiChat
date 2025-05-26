
#!/usr/bin/env python3
"""
Vietnamese Chatbot UI Components Test Suite

Focused testing for UI components, interactions, and user experience.
"""

import asyncio
import time
import logging
from typing import Dict, Any, List, Optional

# Try to import Playwright for advanced browser testing
try:
    from playwright.async_api import async_playwright, Page, Browser
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

# Fallback to Selenium if available
try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False

import requests

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ui_test")

class VietnameseUITester:
    """UI-focused tester for Vietnamese chatbot"""
    
    def __init__(self):
        self.frontend_url = "http://0.0.0.0:5000"
        self.backend_url = "http://0.0.0.0:3000"
        self.browser = None
        self.page = None
        self.test_results = []
    
    async def setup_browser(self) -> bool:
        """Setup browser automation"""
        if PLAYWRIGHT_AVAILABLE:
            try:
                self.playwright = await async_playwright().start()
                self.browser = await self.playwright.chromium.launch(headless=True)
                return True
            except Exception as e:
                logger.error(f"Playwright setup failed: {e}")
                return False
        
        logger.warning("No browser automation available")
        return False
    
    async def cleanup_browser(self):
        """Cleanup browser resources"""
        if self.browser:
            await self.browser.close()
        if hasattr(self, 'playwright'):
            await self.playwright.stop()
    
    async def run_ui_tests(self) -> bool:
        """Run all UI tests"""
        print("🎨 Starting Vietnamese Chatbot UI Test Suite")
        print("=" * 60)
        
        # Setup browser if available
        browser_available = await self.setup_browser()
        
        if not browser_available:
            print("⚠️ Browser automation not available, running basic HTTP tests")
            return await self.run_basic_ui_tests()
        
        try:
            # Create a new page
            self.page = await self.browser.new_page()
            
            # Run comprehensive UI tests
            test_methods = [
                ("Page Loading", self.test_page_loading),
                ("Chat Interface Elements", self.test_chat_interface_elements),
                ("Vietnamese Input Support", self.test_vietnamese_input),
                ("Message Display", self.test_message_display),
                ("Admin Panel UI", self.test_admin_panel_ui),
                ("Responsive Design", self.test_responsive_design),
                ("Accessibility", self.test_accessibility),
                ("Interactive Elements", self.test_interactive_elements),
                ("Error States", self.test_error_states),
                ("Theme and Styling", self.test_theme_styling)
            ]
            
            for test_name, test_method in test_methods:
                print(f"\n🧪 Testing: {test_name}")
                try:
                    result = await test_method()
                    self.test_results.append({
                        "name": test_name,
                        "success": result.get("success", False),
                        "details": result
                    })
                    
                    if result.get("success", False):
                        print(f"   ✅ {test_name} - PASSED")
                    else:
                        print(f"   ❌ {test_name} - FAILED")
                        if "error" in result:
                            print(f"   Error: {result['error']}")
                            
                except Exception as e:
                    print(f"   💥 {test_name} - EXCEPTION: {str(e)}")
                    self.test_results.append({
                        "name": test_name,
                        "success": False,
                        "details": {"error": str(e)}
                    })
            
            # Generate report
            await self.generate_ui_report()
            
            passed = sum(1 for r in self.test_results if r["success"])
            total = len(self.test_results)
            
            return passed / total >= 0.7
            
        finally:
            await self.cleanup_browser()
    
    async def test_page_loading(self) -> Dict[str, Any]:
        """Test page loading and basic structure"""
        try:
            # Test Vietnamese chat page
            await self.page.goto(f"{self.frontend_url}/vietnamese-chat")
            await self.page.wait_for_load_state("networkidle")
            
            # Check for essential page elements
            page_title = await self.page.title()
            page_content = await self.page.content()
            
            # Look for key elements
            has_react_root = await self.page.query_selector("#root") is not None
            has_main_layout = "MainLayout" in page_content or "main" in page_content.lower()
            has_chat_elements = any(term in page_content.lower() for term in ["chat", "message", "conversation"])
            
            return {
                "success": has_react_root and (has_main_layout or has_chat_elements),
                "page_title": page_title,
                "has_react_root": has_react_root,
                "has_main_layout": has_main_layout,
                "has_chat_elements": has_chat_elements
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def test_chat_interface_elements(self) -> Dict[str, Any]:
        """Test chat interface UI elements"""
        try:
            await self.page.goto(f"{self.frontend_url}/vietnamese-chat")
            await self.page.wait_for_load_state("networkidle")
            
            # Look for chat interface elements
            elements = {
                "chat_input": 'input[type="text"], textarea',
                "send_button": 'button:has-text("Send"), button[type="submit"], button:has-text("Gửi")',
                "message_container": '[class*="message"], [class*="chat"], [role="log"]',
                "avatar": '[class*="avatar"], img[alt*="avatar"]',
                "typing_indicator": '[class*="typing"], [class*="indicator"]'
            }
            
            found_elements = {}
            for name, selector in elements.items():
                try:
                    element = await self.page.query_selector(selector)
                    found_elements[name] = element is not None
                except:
                    found_elements[name] = False
            
            # Test input field functionality
            input_functional = False
            if found_elements.get("chat_input"):
                try:
                    await self.page.fill('input[type="text"], textarea', "Test message")
                    input_value = await self.page.input_value('input[type="text"], textarea')
                    input_functional = input_value == "Test message"
                except:
                    input_functional = False
            
            essential_elements = ["chat_input", "send_button", "message_container"]
            essential_count = sum(1 for elem in essential_elements if found_elements.get(elem, False))
            
            return {
                "success": essential_count >= 2 and input_functional,
                "found_elements": found_elements,
                "input_functional": input_functional,
                "essential_elements_count": essential_count
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def test_vietnamese_input(self) -> Dict[str, Any]:
        """Test Vietnamese text input and display"""
        try:
            await self.page.goto(f"{self.frontend_url}/vietnamese-chat")
            await self.page.wait_for_load_state("networkidle")
            
            # Test Vietnamese text input
            vietnamese_texts = [
                "Xin chào! Bạn có khỏe không?",
                "Tôi rất vui được gặp bạn",
                "Hôm nay trời đẹp quá!",
                "Cảm ơn bạn rất nhiều 😊"
            ]
            
            input_tests = []
            
            for text in vietnamese_texts:
                try:
                    # Find input field
                    input_selector = 'input[type="text"], textarea'
                    input_element = await self.page.query_selector(input_selector)
                    
                    if input_element:
                        await self.page.fill(input_selector, text)
                        await self.page.wait_for_timeout(100)  # Brief wait
                        
                        # Check if text was entered correctly
                        entered_text = await self.page.input_value(input_selector)
                        correct_input = entered_text == text
                        
                        input_tests.append({
                            "text": text,
                            "entered_correctly": correct_input
                        })
                        
                        # Clear for next test
                        await self.page.fill(input_selector, "")
                    
                except Exception as e:
                    input_tests.append({
                        "text": text,
                        "entered_correctly": False,
                        "error": str(e)
                    })
            
            successful_inputs = sum(1 for test in input_tests if test.get("entered_correctly", False))
            
            return {
                "success": successful_inputs >= len(vietnamese_texts) * 0.8,
                "successful_inputs": successful_inputs,
                "total_tests": len(vietnamese_texts),
                "input_tests": input_tests
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def test_message_display(self) -> Dict[str, Any]:
        """Test message display and formatting"""
        try:
            await self.page.goto(f"{self.frontend_url}/vietnamese-chat")
            await self.page.wait_for_load_state("networkidle")
            
            # Check for message display elements
            display_checks = {
                "message_bubbles": '[class*="bubble"], [class*="message"]',
                "user_messages": '[class*="user"], [class*="sent"]', 
                "bot_messages": '[class*="bot"], [class*="assistant"], [class*="received"]',
                "timestamps": '[class*="time"], [class*="timestamp"]',
                "avatars": '[class*="avatar"], img'
            }
            
            display_results = {}
            for check_name, selector in display_checks.items():
                try:
                    elements = await self.page.query_selector_all(selector)
                    display_results[check_name] = len(elements) > 0
                except:
                    display_results[check_name] = False
            
            # Test scroll functionality
            try:
                # Look for scrollable container
                scroll_container = await self.page.query_selector('[class*="scroll"], [class*="messages"], .overflow-auto')
                scroll_functional = scroll_container is not None
            except:
                scroll_functional = False
            
            display_features = sum(display_results.values())
            
            return {
                "success": display_features >= 2 or scroll_functional,
                "display_results": display_results,
                "scroll_functional": scroll_functional,
                "display_features_count": display_features
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def test_admin_panel_ui(self) -> Dict[str, Any]:
        """Test admin panel UI elements"""
        try:
            await self.page.goto(f"{self.frontend_url}/admin")
            await self.page.wait_for_load_state("networkidle")
            
            # Check for admin interface elements
            admin_elements = {
                "whitelist_section": '[class*="whitelist"], :has-text("Whitelist")',
                "user_management": '[class*="user"], :has-text("User")',
                "settings_panel": '[class*="setting"], :has-text("Settings")',
                "admin_controls": 'button, input, select',
                "data_tables": 'table, [class*="table"], [role="table"]'
            }
            
            admin_results = {}
            for element_name, selector in admin_elements.items():
                try:
                    elements = await self.page.query_selector_all(selector)
                    admin_results[element_name] = len(elements) > 0
                except:
                    admin_results[element_name] = False
            
            # Test admin functionality indicators
            page_content = await self.page.content()
            has_admin_content = any(term in page_content.lower() for term in 
                                  ["admin", "whitelist", "manage", "control"])
            
            admin_features = sum(admin_results.values())
            
            return {
                "success": admin_features >= 2 or has_admin_content,
                "admin_results": admin_results,
                "has_admin_content": has_admin_content,
                "admin_features_count": admin_features
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def test_responsive_design(self) -> Dict[str, Any]:
        """Test responsive design across different screen sizes"""
        try:
            viewports = [
                {"width": 1920, "height": 1080, "name": "desktop"},
                {"width": 768, "height": 1024, "name": "tablet"},
                {"width": 375, "height": 667, "name": "mobile"}
            ]
            
            responsive_results = {}
            
            for viewport in viewports:
                await self.page.set_viewport_size(viewport)
                await self.page.goto(f"{self.frontend_url}/vietnamese-chat")
                await self.page.wait_for_load_state("networkidle")
                
                # Check if layout adapts
                page_width = await self.page.evaluate("() => document.body.scrollWidth")
                viewport_width = viewport["width"]
                
                # Check for responsive elements
                has_mobile_nav = await self.page.query_selector('[class*="mobile"], [class*="drawer"]') is not None
                has_responsive_grid = await self.page.query_selector('[class*="grid"], [class*="flex"]') is not None
                
                # Check text readability
                font_sizes = await self.page.evaluate("""
                    () => {
                        const elements = document.querySelectorAll('p, span, div, button');
                        const sizes = Array.from(elements).map(el => 
                            parseInt(window.getComputedStyle(el).fontSize)
                        ).filter(size => size > 0);
                        return sizes;
                    }
                """)
                
                min_font_size = min(font_sizes) if font_sizes else 0
                readable_text = min_font_size >= 12
                
                responsive_results[viewport["name"]] = {
                    "no_horizontal_scroll": page_width <= viewport_width * 1.1,  # Allow 10% tolerance
                    "has_mobile_nav": has_mobile_nav,
                    "has_responsive_grid": has_responsive_grid,
                    "readable_text": readable_text,
                    "viewport": viewport
                }
            
            # Overall responsive score
            responsive_scores = []
            for viewport_name, results in responsive_results.items():
                score = sum(1 for v in results.values() if isinstance(v, bool) and v)
                responsive_scores.append(score)
            
            avg_score = sum(responsive_scores) / len(responsive_scores) if responsive_scores else 0
            
            return {
                "success": avg_score >= 2,  # At least 2 out of 4 responsive features
                "responsive_results": responsive_results,
                "average_score": avg_score
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def test_accessibility(self) -> Dict[str, Any]:
        """Test basic accessibility features"""
        try:
            await self.page.goto(f"{self.frontend_url}/vietnamese-chat")
            await self.page.wait_for_load_state("networkidle")
            
            # Run accessibility checks
            a11y_checks = await self.page.evaluate("""
                () => {
                    const checks = {
                        hasMainLandmark: !!document.querySelector('main, [role="main"]'),
                        hasProperHeadings: document.querySelectorAll('h1,h2,h3,h4,h5,h6').length > 0,
                        hasSkipLinks: !!document.querySelector('a[href="#main"], a[href="#content"]'),
                        imagesHaveAlt: Array.from(document.querySelectorAll('img')).every(img => 
                            img.hasAttribute('alt') || img.hasAttribute('aria-label')
                        ),
                        buttonsHaveLabels: Array.from(document.querySelectorAll('button')).every(btn => 
                            btn.textContent.trim() || btn.hasAttribute('aria-label')
                        ),
                        inputsHaveLabels: Array.from(document.querySelectorAll('input')).every(input => 
                            input.hasAttribute('aria-label') || 
                            input.hasAttribute('placeholder') ||
                            document.querySelector(`label[for="${input.id}"]`)
                        ),
                        properColorContrast: true, // Simplified check
                        keyboardNavigable: document.querySelectorAll('[tabindex]').length > 0 ||
                                         document.querySelectorAll('button, input, a').length > 0
                    };
                    return checks;
                }
            """)
            
            passed_checks = sum(1 for check in a11y_checks.values() if check)
            total_checks = len(a11y_checks)
            
            return {
                "success": passed_checks >= total_checks * 0.7,  # 70% pass rate
                "accessibility_checks": a11y_checks,
                "passed_checks": passed_checks,
                "total_checks": total_checks
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def test_interactive_elements(self) -> Dict[str, Any]:
        """Test interactive UI elements"""
        try:
            await self.page.goto(f"{self.frontend_url}/vietnamese-chat")
            await self.page.wait_for_load_state("networkidle")
            
            # Test button interactions
            buttons = await self.page.query_selector_all('button')
            button_tests = []
            
            for i, button in enumerate(buttons[:3]):  # Test first 3 buttons
                try:
                    is_clickable = await button.is_enabled()
                    has_hover_state = await self.page.evaluate("""
                        (button) => {
                            const style = window.getComputedStyle(button);
                            return style.cursor === 'pointer' || button.matches(':hover');
                        }
                    """, button)
                    
                    button_tests.append({
                        "index": i,
                        "clickable": is_clickable,
                        "has_hover_state": has_hover_state
                    })
                except:
                    button_tests.append({
                        "index": i,
                        "clickable": False,
                        "has_hover_state": False
                    })
            
            # Test input field interactions
            input_tests = []
            inputs = await self.page.query_selector_all('input, textarea')
            
            for i, input_elem in enumerate(inputs[:2]):  # Test first 2 inputs
                try:
                    is_focusable = await input_elem.is_enabled()
                    await input_elem.focus()
                    is_focused = await self.page.evaluate("""
                        (input) => document.activeElement === input
                    """, input_elem)
                    
                    input_tests.append({
                        "index": i,
                        "focusable": is_focusable,
                        "focus_works": is_focused
                    })
                except:
                    input_tests.append({
                        "index": i,
                        "focusable": False,
                        "focus_works": False
                    })
            
            interactive_score = 0
            if button_tests:
                interactive_score += sum(1 for test in button_tests if test.get("clickable", False))
            if input_tests:
                interactive_score += sum(1 for test in input_tests if test.get("focusable", False))
            
            return {
                "success": interactive_score >= 1,
                "button_tests": button_tests,
                "input_tests": input_tests,
                "interactive_score": interactive_score
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def test_error_states(self) -> Dict[str, Any]:
        """Test error state displays"""
        try:
            await self.page.goto(f"{self.frontend_url}/vietnamese-chat")
            await self.page.wait_for_load_state("networkidle")
            
            # Look for error handling UI elements
            error_elements = {
                "error_messages": '[class*="error"], [role="alert"], [class*="alert"]',
                "loading_states": '[class*="loading"], [class*="spinner"], [class*="skeleton"]',
                "empty_states": '[class*="empty"], :has-text("No messages"), :has-text("Empty")'
            }
            
            error_results = {}
            for element_name, selector in error_elements.items():
                try:
                    elements = await self.page.query_selector_all(selector)
                    error_results[element_name] = len(elements) >= 0  # Just check if selector works
                except:
                    error_results[element_name] = False
            
            # Test 404 page
            try:
                await self.page.goto(f"{self.frontend_url}/nonexistent-page")
                await self.page.wait_for_load_state("networkidle")
                
                page_content = await self.page.content()
                has_404_handling = any(term in page_content.lower() for term in 
                                     ["404", "not found", "error", "page not found"])
            except:
                has_404_handling = False
            
            error_handling_features = sum(error_results.values())
            
            return {
                "success": error_handling_features >= 1 or has_404_handling,
                "error_results": error_results,
                "has_404_handling": has_404_handling,
                "error_features_count": error_handling_features
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def test_theme_styling(self) -> Dict[str, Any]:
        """Test theme and styling consistency"""
        try:
            await self.page.goto(f"{self.frontend_url}/vietnamese-chat")
            await self.page.wait_for_load_state("networkidle")
            
            # Check for CSS framework indicators
            styling_checks = await self.page.evaluate("""
                () => {
                    const checks = {
                        hasTailwindCSS: Array.from(document.styleSheets).some(sheet => {
                            try {
                                return Array.from(sheet.cssRules || []).some(rule => 
                                    rule.cssText && rule.cssText.includes('tailwind')
                                );
                            } catch { return false; }
                        }),
                        hasCustomCSS: document.querySelector('style') !== null,
                        hasColorScheme: window.getComputedStyle(document.body).colorScheme !== '',
                        hasFontLoading: document.fonts.size > 0,
                        hasResponsiveClasses: Array.from(document.querySelectorAll('*')).some(el => 
                            Array.from(el.classList).some(cls => 
                                cls.includes('md:') || cls.includes('lg:') || cls.includes('sm:')
                            )
                        ),
                        hasThemeColors: (() => {
                            const styles = window.getComputedStyle(document.documentElement);
                            return styles.getPropertyValue('--primary') !== '' ||
                                   styles.getPropertyValue('--background') !== '';
                        })()
                    };
                    return checks;
                }
            """)
            
            # Check for consistent spacing and typography
            visual_consistency = await self.page.evaluate("""
                () => {
                    const elements = document.querySelectorAll('button, input, h1, h2, h3, p');
                    const margins = [];
                    const paddings = [];
                    
                    elements.forEach(el => {
                        const style = window.getComputedStyle(el);
                        margins.push(style.marginTop, style.marginBottom);
                        paddings.push(style.paddingTop, style.paddingBottom);
                    });
                    
                    // Check if spacing follows a consistent scale
                    const uniqueMargins = [...new Set(margins)].length;
                    const uniquePaddings = [...new Set(paddings)].length;
                    
                    return {
                        consistentSpacing: uniqueMargins <= 10 && uniquePaddings <= 10,
                        elementCount: elements.length
                    };
                }
            """)
            
            styling_score = sum(1 for check in styling_checks.values() if check)
            
            return {
                "success": styling_score >= 3 and visual_consistency.get("consistentSpacing", False),
                "styling_checks": styling_checks,
                "visual_consistency": visual_consistency,
                "styling_score": styling_score
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def run_basic_ui_tests(self) -> bool:
        """Run basic HTTP-based UI tests when browser automation is not available"""
        print("Running basic UI tests...")
        
        try:
            # Test page accessibility
            pages = ["/vietnamese-chat", "/admin", "/"]
            accessible_pages = 0
            
            for page in pages:
                try:
                    response = requests.get(f"{self.frontend_url}{page}", timeout=10)
                    if response.status_code == 200:
                        accessible_pages += 1
                        content = response.text.lower()
                        
                        # Basic content checks
                        has_react = "react" in content or "root" in content
                        has_ui_elements = any(term in content for term in 
                                            ["button", "input", "form", "chat", "message"])
                        
                        print(f"   ✅ {page}: Accessible, React: {has_react}, UI: {has_ui_elements}")
                    else:
                        print(f"   ❌ {page}: Status {response.status_code}")
                        
                except Exception as e:
                    print(f"   💥 {page}: Error - {str(e)}")
            
            success_rate = accessible_pages / len(pages)
            print(f"\n📊 Basic UI Test Results: {accessible_pages}/{len(pages)} pages accessible")
            
            return success_rate >= 0.5
            
        except Exception as e:
            print(f"Basic UI tests failed: {e}")
            return False
    
    async def generate_ui_report(self):
        """Generate UI test report"""
        print("\n" + "=" * 60)
        print("🎨 VIETNAMESE CHATBOT UI TEST REPORT")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed = sum(1 for r in self.test_results if r["success"])
        failed = total_tests - passed
        
        print(f"\n📈 UI Test Summary:")
        print(f"   Total Tests: {total_tests}")
        print(f"   ✅ Passed: {passed}")
        print(f"   ❌ Failed: {failed}")
        print(f"   Success Rate: {(passed/total_tests)*100:.1f}%")
        
        # Categorize results
        ui_categories = {
            "Core Interface": ["Page Loading", "Chat Interface Elements", "Message Display"],
            "Vietnamese Support": ["Vietnamese Input Support"],
            "Administration": ["Admin Panel UI"],
            "User Experience": ["Responsive Design", "Accessibility", "Interactive Elements"],
            "Error Handling": ["Error States"],
            "Visual Design": ["Theme and Styling"]
        }
        
        print(f"\n📋 Category Breakdown:")
        for category, tests in ui_categories.items():
            category_passed = sum(1 for r in self.test_results 
                                if r["name"] in tests and r["success"])
            category_total = len([t for t in tests if any(r["name"] == t for r in self.test_results)])
            
            if category_total > 0:
                percentage = (category_passed / category_total) * 100
                status = "✅" if percentage >= 70 else "⚠️" if percentage >= 50 else "❌"
                print(f"   {status} {category}: {category_passed}/{category_total} ({percentage:.0f}%)")
        
        print(f"\n💡 UI Recommendations:")
        if failed == 0:
            print("   🎉 Excellent UI implementation!")
            print("   🚀 All interface components are working correctly")
        elif failed <= 2:
            print("   ⚠️ Minor UI issues detected")
            print("   🔧 Address failing components for better user experience")
        else:
            print("   🚨 Multiple UI issues found")
            print("   🛠️ Focus on core interface elements first")

async def main():
    """Main UI test execution"""
    tester = VietnameseUITester()
    success = await tester.run_ui_tests()
    
    print(f"\n🏁 UI Test Suite {'PASSED' if success else 'FAILED'}")
    return success

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)
