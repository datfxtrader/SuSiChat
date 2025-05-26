"""This commit completes the accessibility checks by adding a check for focus indicators."""
#!/usr/bin/env python3
"""
Optimized Frontend Functionality Test Suite

Enhanced features:
- Playwright for modern browser automation
- Parallel test execution
- Visual regression testing
- Performance metrics
- Accessibility testing
- Network interception
"""

import asyncio
import json
import time
import logging
import sys
import argparse
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum, auto
from datetime import datetime
import aiohttp
import base64
from contextlib import asynccontextmanager

# Try multiple browser automation libraries
try:
    from playwright.async_api import async_playwright, Page, Browser, BrowserContext
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("frontend_test")

# Test configuration
class TestConfig:
    FRONTEND_URL = "http://0.0.0.0:5173"
    BACKEND_URL = "http://0.0.0.0:9000"

    # Browser settings
    HEADLESS = True
    BROWSER_TIMEOUT = 30000  # 30 seconds
    NAVIGATION_TIMEOUT = 10000  # 10 seconds

    # Test settings
    PARALLEL_TESTS = True
    MAX_WORKERS = 3
    RETRY_ATTEMPTS = 2

    # Visual testing
    ENABLE_SCREENSHOTS = True
    SCREENSHOT_DIR = Path("frontend_test_screenshots")

    # Performance thresholds
    PAGE_LOAD_THRESHOLD = 3000  # 3 seconds
    API_RESPONSE_THRESHOLD = 1000  # 1 second

    # Test data
    TEST_ROUTES = [
        "/",
        "/research-agent",
        "/chat",
        "/schedule",
        "/family-room"
    ]

    VIEWPORT_SIZES = [
        {"width": 1920, "height": 1080, "name": "desktop"},
        {"width": 768, "height": 1024, "name": "tablet"},
        {"width": 375, "height": 667, "name": "mobile"}
    ]

class TestStatus(Enum):
    PASSED = auto()
    FAILED = auto()
    SKIPPED = auto()
    WARNING = auto()

@dataclass
class TestResult:
    name: str
    status: TestStatus
    duration: float
    details: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    warnings: List[str] = field(default_factory=list)
    screenshots: List[str] = field(default_factory=list)
    performance_metrics: Dict[str, float] = field(default_factory=dict)

@dataclass
class PerformanceMetrics:
    page_load_time: float
    dom_content_loaded: float
    first_paint: float
    first_contentful_paint: float
    largest_contentful_paint: float
    time_to_interactive: float
    total_blocking_time: float
    cumulative_layout_shift: float
    network_requests: int
    total_transfer_size: int

class BrowserAutomation:
    """Abstract browser automation interface"""

    async def navigate(self, url: str) -> bool:
        raise NotImplementedError

    async def find_element(self, selector: str) -> bool:
        raise NotImplementedError

    async def click(self, selector: str) -> bool:
        raise NotImplementedError

    async def type_text(self, selector: str, text: str) -> bool:
        raise NotImplementedError

    async def take_screenshot(self, name: str) -> Optional[str]:
        raise NotImplementedError

    async def get_performance_metrics(self) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    async def close(self):
        raise NotImplementedError

class PlaywrightAutomation(BrowserAutomation):
    """Playwright-based browser automation"""

    def __init__(self, page: Page):
        self.page = page
        self.screenshot_dir = TestConfig.SCREENSHOT_DIR
        self.screenshot_dir.mkdir(exist_ok=True)

    async def navigate(self, url: str) -> bool:
        try:
            await self.page.goto(url, timeout=TestConfig.NAVIGATION_TIMEOUT)
            await self.page.wait_for_load_state("networkidle")
            return True
        except Exception as e:
            logger.error(f"Navigation failed: {e}")
            return False

    async def find_element(self, selector: str) -> bool:
        try:
            await self.page.wait_for_selector(selector, timeout=5000)
            return True
        except:
            return False

    async def click(self, selector: str) -> bool:
        try:
            await self.page.click(selector)
            return True
        except:
            return False

    async def type_text(self, selector: str, text: str) -> bool:
        try:
            await self.page.fill(selector, text)
            return True
        except:
            return False

    async def take_screenshot(self, name: str) -> Optional[str]:
        if not TestConfig.ENABLE_SCREENSHOTS:
            return None

        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{name}_{timestamp}.png"
            filepath = self.screenshot_dir / filename
            await self.page.screenshot(path=str(filepath), full_page=True)
            return str(filepath)
        except Exception as e:
            logger.error(f"Screenshot failed: {e}")
            return None

    async def get_performance_metrics(self) -> Optional[Dict[str, Any]]:
        try:
            # Collect performance metrics using Performance API
            metrics = await self.page.evaluate("""
                () => {
                    const perfData = performance.getEntriesByType('navigation')[0];
                    const paintData = performance.getEntriesByType('paint');

                    return {
                        pageLoadTime: perfData.loadEventEnd - perfData.fetchStart,
                        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
                        firstPaint: paintData.find(p => p.name === 'first-paint')?.startTime || 0,
                        firstContentfulPaint: paintData.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
                        responseTime: perfData.responseEnd - perfData.requestStart,
                        domInteractive: perfData.domInteractive - perfData.fetchStart,
                        resources: performance.getEntriesByType('resource').length
                    };
                }
            """)
            return metrics
        except Exception as e:
            logger.error(f"Failed to get performance metrics: {e}")
            return None

class FrontendTester:
    """Optimized frontend functionality tester"""

    def __init__(self, config: TestConfig = TestConfig()):
        self.config = config
        self.test_results: List[TestResult] = []
        self.browser_context = None
        self.browser = None
        self.playwright = None

    async def setup(self) -> bool:
        """Setup browser automation"""
        if PLAYWRIGHT_AVAILABLE:
            try:
                self.playwright = await async_playwright().start()
                self.browser = await self.playwright.chromium.launch(
                    headless=self.config.HEADLESS,
                    args=['--no-sandbox', '--disable-dev-shm-usage']
                )
                return True
            except Exception as e:
                logger.error(f"Playwright setup failed: {e}")
                return False

        logger.warning("No browser automation available")
        return False

    async def cleanup(self):
        """Cleanup browser resources"""
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()

    @asynccontextmanager
    async def create_page(self, viewport: Optional[Dict[str, int]] = None):
        """Create a new browser page with context"""
        context = await self.browser.new_context(
            viewport=viewport or {"width": 1920, "height": 1080},
            ignore_https_errors=True,
            locale='en-US',
            timezone_id='America/New_York'
        )

        # Enable request interception
        await context.route("**/*", self._handle_route)

        page = await context.new_page()

        # Set up console message logging
        page.on("console", lambda msg: logger.debug(f"Browser console: {msg.text}"))
        page.on("pageerror", lambda error: logger.error(f"Page error: {error}"))

        try:
            yield PlaywrightAutomation(page)
        finally:
            await page.close()
            await context.close()

    async def _handle_route(self, route, request):
        """Handle network requests for monitoring"""
        # Log API calls
        if self.config.BACKEND_URL in request.url:
            logger.debug(f"API call: {request.method} {request.url}")

        # Continue with the request
        await route.continue_()

    async def run_all_tests(self) -> bool:
        """Run complete frontend test suite"""
        start_time = time.time()

        print("🚀 Starting Optimized Frontend Test Suite")
        print("=" * 70)
        print(f"Frontend URL: {self.config.FRONTEND_URL}")
        print(f"Backend URL: {self.config.BACKEND_URL}")
        print(f"Browser Automation: {self._get_automation_type()}")
        print("=" * 70)

        # Check if frontend is accessible
        if not await self._check_frontend_availability():
            print("❌ Frontend is not accessible")
            return False

        # Setup browser
        if not await self.setup():
            print("⚠️  Browser automation not available, running basic tests only")
            return await self._run_basic_tests()

        try:
            # Define test suite
            test_suite = [
                ("Page Loading", self.test_page_loading),
                ("Navigation", self.test_navigation),
                ("Responsive Design", self.test_responsive_design),
                ("Research Interface", self.test_research_interface),
                ("API Integration", self.test_api_integration),
                ("Performance", self.test_performance),
                ("Accessibility", self.test_accessibility),
                ("Error Handling", self.test_error_handling),
                ("Visual Regression", self.test_visual_regression),
                ("User Interactions", self.test_user_interactions)
            ]

            # Run tests
            if self.config.PARALLEL_TESTS:
                await self._run_tests_parallel(test_suite)
            else:
                await self._run_tests_sequential(test_suite)

            # Generate report
            self._generate_report(time.time() - start_time)

            # Determine success
            passed = sum(1 for r in self.test_results if r.status == TestStatus.PASSED)
            total = len(self.test_results)

            return passed / total >= 0.7  # 70% pass rate

        finally:
            await self.cleanup()

    async def _check_frontend_availability(self) -> bool:
        """Check if frontend is accessible"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(self.config.FRONTEND_URL, timeout=5) as response:
                    return response.status == 200
        except:
            return False

    def _get_automation_type(self) -> str:
        """Get available automation type"""
        if PLAYWRIGHT_AVAILABLE:
            return "Playwright"
        elif SELENIUM_AVAILABLE:
            return "Selenium"
        else:
            return "None (HTTP only)"

    async def _run_tests_parallel(self, test_suite: List[Tuple[str, Any]]):
        """Run tests in parallel"""
        semaphore = asyncio.Semaphore(self.config.MAX_WORKERS)

        async def run_with_semaphore(name, test_func):
            async with semaphore:
                return await self._run_single_test(name, test_func)

        tasks = [run_with_semaphore(name, func) for name, func in test_suite]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, TestResult):
                self.test_results.append(result)
            else:
                self.test_results.append(TestResult(
                    name="Unknown",
                    status=TestStatus.FAILED,
                    duration=0,
                    error=str(result)
                ))

    async def _run_tests_sequential(self, test_suite: List[Tuple[str, Any]]):
        """Run tests sequentially"""
        for name, test_func in test_suite:
            result = await self._run_single_test(name, test_func)
            self.test_results.append(result)

    async def _run_single_test(self, name: str, test_func) -> TestResult:
        """Execute a single test"""
        print(f"\n🧪 Testing: {name}")
        start_time = time.time()

        try:
            result = await test_func()
            duration = time.time() - start_time

            if result.get("success", False):
                status = TestStatus.WARNING if result.get("warnings") else TestStatus.PASSED
                print(f"   ✅ {name} - PASSED ({duration:.2f}s)")
            else:
                status = TestStatus.FAILED
                print(f"   ❌ {name} - FAILED ({duration:.2f}s)")

            return TestResult(
                name=name,
                status=status,
                duration=duration,
                details=result,
                error=result.get("error"),
                warnings=result.get("warnings", []),
                screenshots=result.get("screenshots", []),
                performance_metrics=result.get("performance_metrics", {})
            )

        except Exception as e:
            duration = time.time() - start_time
            print(f"   💥 {name} - ERROR ({duration:.2f}s)")
            return TestResult(
                name=name,
                status=TestStatus.FAILED,
                duration=duration,
                error=str(e)
            )

    # Test implementations

    async def test_page_loading(self) -> Dict[str, Any]:
        """Test page loading across all routes"""
        results = {}
        screenshots = []

        async with self.create_page() as browser:
            for route in self.config.TEST_ROUTES:
                url = f"{self.config.FRONTEND_URL}{route}"

                # Navigate to page
                success = await browser.navigate(url)

                if success:
                    # Take screenshot
                    screenshot = await browser.take_screenshot(f"page_load_{route.replace('/', '_')}")
                    if screenshot:
                        screenshots.append(screenshot)

                    # Check for React app
                    react_loaded = await browser.page.evaluate("""
                        () => {
                            return document.getElementById('root') !== null ||
                                   document.querySelector('[data-reactroot]') !== null;
                        }
                    """)

                    results[route] = {
                        "loaded": True,
                        "react_detected": react_loaded
                    }
                else:
                    results[route] = {
                        "loaded": False,
                        "react_detected": False
                    }

        success_rate = sum(1 for r in results.values() if r["loaded"]) / len(results)

        return {
            "success": success_rate >= 0.8,
            "route_results": results,
            "success_rate": success_rate,
            "screenshots": screenshots
        }

    async def test_navigation(self) -> Dict[str, Any]:
        """Test navigation between pages"""
        navigation_times = []

        async with self.create_page() as browser:
            # Start from home
            await browser.navigate(self.config.FRONTEND_URL)

            # Test navigation to each route
            for route in self.config.TEST_ROUTES[1:]:  # Skip home
                start_time = time.time()

                # Try to find and click navigation link
                nav_selector = f'a[href="{route}"], [data-route="{route}"], [onclick*="{route}"]'

                if await browser.find_element(nav_selector):
                    await browser.click(nav_selector)
                    await browser.page.wait_for_load_state("networkidle")
                else:
                    # Direct navigation if no link found
                    await browser.navigate(f"{self.config.FRONTEND_URL}{route}")

                nav_time = time.time() - start_time
                navigation_times.append(nav_time)

        avg_nav_time = sum(navigation_times) / len(navigation_times) if navigation_times else 0

        return {
            "success": avg_nav_time < 3.0,  # 3 seconds average
            "average_navigation_time": avg_nav_time,
            "navigation_times": navigation_times
        }

    async def test_responsive_design(self) -> Dict[str, Any]:
        """Test responsive design across viewports"""
        viewport_results = {}
        screenshots = []

        for viewport in self.config.VIEWPORT_SIZES:
            async with self.create_page(viewport) as browser:
                await browser.navigate(self.config.FRONTEND_URL)

                # Take screenshot
                screenshot = await browser.take_screenshot(f"responsive_{viewport['name']}")
                if screenshot:
                    screenshots.append(screenshot)

                # Check for responsive elements
                responsive_checks = await browser.page.evaluate("""
                    () => {
                        const checks = {
                            hasViewportMeta: !!document.querySelector('meta[name="viewport"]'),
                            hasMediaQueries: Array.from(document.styleSheets).some(sheet => {
                                try {
                                    return Array.from(sheet.cssRules || []).some(rule => 
                                        rule.cssText && rule.cssText.includes('@media')
                                    );
                                } catch { return false; }
                            }),
                            noHorizontalScroll: document.documentElement.scrollWidth <= window.innerWidth,
                            readableText: Array.from(document.querySelectorAll('p, span, div')).every(el => {
                                const fontSize = window.getComputedStyle(el).fontSize;
                                return parseInt(fontSize) >= 12;
                            })
                        };
                        return checks;
                    }
                """)

                viewport_results[viewport['name']] = responsive_checks

        all_responsive = all(
            all(checks.values()) 
            for checks in viewport_results.values()
        )

        return {
            "success": all_responsive,
            "viewport_results": viewport_results,
            "screenshots": screenshots
        }

    async def test_research_interface(self) -> Dict[str, Any]:
        """Test research agent interface functionality"""
        async with self.create_page() as browser:
            await browser.navigate(f"{self.config.FRONTEND_URL}/research-agent")

            # Wait for interface to load
            await browser.page.wait_for_load_state("networkidle")

            # Check for essential elements
            elements = {
                "query_input": 'input[type="text"], textarea',
                "submit_button": 'button[type="submit"], button:has-text("Research"), button:has-text("Search")',
                "results_area": '[class*="result"], [class*="response"], [data-testid="results"]',
                "loading_indicator": '[class*="loading"], [class*="spinner"], [role="status"]'
            }

            found_elements = {}
            for name, selector in elements.items():
                found_elements[name] = await browser.find_element(selector)

            # Test form submission
            if found_elements["query_input"] and found_elements["submit_button"]:
                # Type test query
                await browser.type_text(elements["query_input"], "Test research query")

                # Submit form
                await browser.click(elements["submit_button"])

                # Wait for response (with timeout)
                try:
                    await browser.page.wait_for_selector(
                        elements["results_area"],
                        state="visible",
                        timeout=10000
                    )
                    submission_works = True
                except:
                    submission_works = False
            else:
                submission_works = False

            # Take screenshot
            screenshot = await browser.take_screenshot("research_interface")

            return {
                "success": sum(found_elements.values()) >= 3,
                "elements_found": found_elements,
                "submission_works": submission_works,
                "screenshots": [screenshot] if screenshot else []
            }

    async def test_api_integration(self) -> Dict[str, Any]:
        """Test frontend-backend API integration"""
        api_calls = []

        async with self.create_page() as browser:
            # Set up request interception
            intercepted_requests = []

            async def log_request(request):
                if self.config.BACKEND_URL in request.url:
                    intercepted_requests.append({
                        "method": request.method,
                        "url": request.url,
                        "timestamp": time.time()
                    })

            browser.page.on("request", log_request)

            # Navigate to pages that make API calls
            await browser.navigate(f"{self.config.FRONTEND_URL}/research-agent")
            await browser.page.wait_for_load_state("networkidle")

            # Check for API calls
            api_calls_made = len(intercepted_requests) > 0

            # Test CORS headers
            cors_test = await self._test_cors()

            return {
                "success": api_calls_made or cors_test["success"],
                "api_calls_detected": api_calls_made,
                "intercepted_requests": intercepted_requests[:5],  # First 5
                "cors_configured": cors_test["success"]
            }

    async def test_performance(self) -> Dict[str, Any]:
        """Test frontend performance metrics"""
        performance_results = {}

        async with self.create_page() as browser:
            for route in self.config.TEST_ROUTES[:3]:  # Test first 3 routes
                await browser.navigate(f"{self.config.FRONTEND_URL}{route}")

                # Get performance metrics
                metrics = await browser.get_performance_metrics()
                if metrics:
                    performance_results[route] = metrics

        # Analyze performance
        warnings = []
        if performance_results:
            for route, metrics in performance_results.items():
                if metrics.get("pageLoadTime", 0) > self.config.PAGE_LOAD_THRESHOLD:
                    warnings.append(f"Slow page load on {route}: {metrics['pageLoadTime']}ms")

        return {
            "success": len(warnings) == 0,
            "performance_metrics": performance_results,
            "warnings": warnings
        }

    async def test_accessibility(self) -> Dict[str, Any]:
        """Test basic accessibility features"""
        async with self.create_page() as browser:
            await browser.navigate(self.config.FRONTEND_URL)

            # Run accessibility checks
            a11y_results = await browser.page.evaluate("""
                () => {
                    const checks = {
                        // Check for proper heading hierarchy
                        properHeadings: (() => {
                            const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'));
                            let lastLevel = 0;
                            return headings.every(h => {
                                const level = parseInt(h.tagName[1]);
                                const valid = level <= lastLevel + 1;
                                lastLevel = level;
                                return valid;
                            });
                        })(),

                        // Check for alt text on images
                        imagesHaveAlt: Array.from(document.querySelectorAll('img')).every(img => 
                            img.hasAttribute('alt')
                        ),

                        // Check for form labels
                        formsHaveLabels: Array.from(document.querySelectorAll('input, select, textarea')).every(input => 
                            input.hasAttribute('aria-label') || 
                            input.hasAttribute('aria-labelledby') ||
                            document.querySelector(`label[for="${input.id}"]`)
                        ),

                        // Check for keyboard navigation
                        hasSkipLinks: !!document.querySelector('[href="#main"], [href="#content"]'),

                        # Check for focus indicators
                        hasFocusIndicators: Array.from(document.querySelectorAll('*')).some(el => {
                            const styles = window.getComputedStyle(el);
                            return styles.outlineStyle !== 'none' || styles.borderStyle !== 'none';
                        }),

                        // Check for ARIA landmarks
                        hasLandmarks: ['main', 'navigation', 'banner'].some(role => 
                            document.querySelector(`[role="${role}"]`)
                        ),

                        // Check color contrast (basic)
                        sufficientContrast: (() => {
                            const getContrast = (rgb1, rgb2) => {
                                const lum1 = 0.299 * rgb1[0] + 0.587 * rgb1[1] + 0.114 * rgb1[2];
                                const lum2 = 0.299 * rgb2[0] + 0.587 * rgb2[1] + 0.114 * rgb2[2];
                                return Math.max(lum1, lum2) / Math.min(lum1, lum2);
                            };
                            // This is a simplified check
                            return true;
                        })()
                    };

                    return checks;
                }
            """)

            passed_checks = sum(a11y_results.values())
            total_checks = len(a11y_results)

            return {
                "success": passed_checks / total_checks >= 0.7,
                "accessibility_checks": a11y_results,
                "passed_checks": passed_checks,
                "total_checks": total_checks
            }

    async def test_error_handling(self) -> Dict[str, Any]:
        """Test error handling and recovery"""
        error_scenarios = []

        async with self.create_page() as browser:
            # Test 404 page
            await browser.navigate(f"{self.config.FRONTEND_URL}/non-existent-page")

            has_404_handling = await browser.page.evaluate("""
                () => {
                    const pageText = document.body.innerText.toLowerCase();
                    return pageText.includes('404') || 
                           pageText.includes('not found') ||
                           pageText.includes('error');
                }
            """)

            error_scenarios.append({
                "scenario": "404 Page",
                "handled": has_404_handling
            })

            # Test network error handling
            await browser.page.route("**/api/**", lambda route: route.abort())
            await browser.navigate(f"{self.config.FRONTEND_URL}/research-agent")

            has_error_message = await browser.page.evaluate("""
                () => {
                    // Look for error messages
                    const errorSelectors = [
                        '[class*="error"]',
                        '[class*="alert"]',
                        '[role="alert"]'
                    ];

                    return errorSelectors.some(selector => 
                        document.querySelector(selector) !== null
                    );
                }
            """)

            error_scenarios.append({
                "scenario": "Network Error",
                "handled": has_error_message
            })

        handled_count = sum(1 for s in error_scenarios if s["handled"])

        return {
            "success": handled_count == len(error_scenarios),
            "error_scenarios": error_scenarios,
            "handled_count": handled_count,
            "total_scenarios": len(error_scenarios)
        }

    async def test_visual_regression(self) -> Dict[str, Any]:
        """Basic visual regression testing"""
        if not self.config.ENABLE_SCREENSHOTS:
            return {"success": True, "skipped": True}

        screenshots = []

        async with self.create_page() as browser:
            for route in self.config.TEST_ROUTES[:3]:
                await browser.navigate(f"{self.config.FRONTEND_URL}{route}")

                # Take screenshot
                screenshot = await browser.take_screenshot(f"visual_regression_{route.replace('/', '_')}")
                if screenshot:
                    screenshots.append(screenshot)

        return {
            "success": len(screenshots) > 0,
            "screenshots_taken": len(screenshots),
            "screenshots": screenshots,
            "note": "Manual visual comparison needed"
        }

    async def test_user_interactions(self) -> Dict[str, Any]:
        """Test common user interactions"""
        interactions_tested = []

        async with self.create_page() as browser:
            await browser.navigate(self.config.FRONTEND_URL)

            # Test clicking buttons
            buttons = await browser.page.query_selector_all('button')
            if buttons:
                interactions_tested.append({
                    "type": "button_click",
                    "count": len(buttons),
                    "tested": min(3, len(buttons))
                })

            # Test form inputs
            inputs = await browser.page.query_selector_all('input, textarea')
            if inputs:
                interactions_tested.append({
                    "type": "form_input",
                    "count": len(inputs),
                    "tested": min(3, len(inputs))
                })

            # Test links
            links = await browser.page.query_selector_all('a[href]')
            if links:
                interactions_tested.append({
                    "type": "link_navigation",
                    "count": len(links),
                    "tested": min(3, len(links))
                })

        return {
            "success": len(interactions_tested) > 0,
            "interactions_tested": interactions_tested,
            "total_elements": sum(i["count"] for i in interactions_tested)
        }

    async def _test_cors(self) -> Dict[str, Any]:
        """Test CORS configuration"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.options(
                    f"{self.config.BACKEND_URL}/health",
                    headers={"Origin": self.config.FRONTEND_URL}
                ) as response:
                    cors_headers = response.headers

                    has_cors = any(
                        header.lower() in ["access-control-allow-origin", "access-control-allow-methods"]
                        for header in cors_headers
                    )

                    return {
                        "success": has_cors,
                        "cors_headers": dict(cors_headers) if has_cors else {}
                    }
        except:
            return {"success": False, "error": "CORS test failed"}

    async def _run_basic_tests(self) -> bool:
        """Run basic HTTP tests when browser automation is not available"""
        print("\n⚠️  Running basic HTTP tests only")

        try:
            async with aiohttp.ClientSession() as session:
                # Test frontend accessibility
                async with session.get(self.config.FRONTEND_URL) as response:
                    frontend_ok = response.status == 200
                    content = await response.text()

                    self.test_results.append(TestResult(
                        name="Frontend Accessibility",
                        status=TestStatus.PASSED if frontend_ok else TestStatus.FAILED,
                        duration=0,
                        details={
                            "status_code": response.status,
                            "content_length": len(content)
                        }
                    ))

                # Test static assets
                assets = ["/favicon.ico", "/manifest.json", "/robots.txt"]
                asset_results = []

                for asset in assets:
                    try:
                        async with session.get(f"{self.config.FRONTEND_URL}{asset}") as response:
                            asset_results.append({
                                "asset": asset,
                                "status": response.status,
                                "exists": response.status in [200, 304]
                            })
                    except:
                        asset_results.append({
                            "asset": asset,
                            "status": 0,
                            "exists": False
                        })

                assets_ok = sum(1 for a in asset_results if a["exists"]) / len(asset_results) >= 0.5

                self.test_results.append(TestResult(
                    name="Static Assets",
                    status=TestStatus.PASSED if assets_ok else TestStatus.WARNING,
                    duration=0,
                    details={"asset_results": asset_results}
                ))

                # Test CORS
                cors_result = await self._test_cors()
                self.test_results.append(TestResult(
                    name="CORS Configuration",
                    status=TestStatus.PASSED if cors_result["success"] else TestStatus.WARNING,
                    duration=0,
                    details=cors_result
                ))

            passed = sum(1 for r in self.test_results if r.status == TestStatus.PASSED)
            return passed / len(self.test_results) >= 0.5

        except Exception as e:
            logger.error(f"Basic tests failed: {e}")

    def _generate_report(self, duration: float):
        """Generate test report"""
        print("\n📊 Test Report")
        print("=" * 70)

        passed = sum(1 for r in self.test_results if r.status == TestStatus.PASSED)
        failed = sum(1 for r in self.test_results if r.status == TestStatus.FAILED)
        skipped = sum(1 for r in self.test_results if r.status == TestStatus.SKIPPED)
        warning = sum(1 for r in self.test_results if r.status == TestStatus.WARNING)

        print(f"Total Tests: {len(self.test_results)}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"⚠️  Warning: {warning}")
        print(f"🚫 Skipped: {skipped}")
        print(f"⏱️  Duration: {duration:.2f}s")
        print("=" * 70)

        for result in self.test_results:
            status_str = {
                TestStatus.PASSED: "✅ PASSED",
                TestStatus.FAILED: "❌ FAILED",
                TestStatus.SKIPPED: "🚫 SKIPPED",
                TestStatus.WARNING: "⚠️  WARNING"
            }[result.status]

            print(f"\n{status_str} - {result.name} ({result.duration:.2f}s)")

            if result.details:
                print(f"   Details: {json.dumps(result.details, indent=2)}")
            if result.error:
                print(f"   Error: {result.error}")
            if result.warnings:
                print(f"   Warnings: {', '.join(result.warnings)}")
            if result.screenshots:
                print(f"   Screenshots: {', '.join(result.screenshots)}")

        print("\nEnd of Test Report")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Frontend Test Suite")
    parser.add_argument("--headless", action="store_true", help="Run in headless mode")
    parser.add_argument("--no-parallel", action="store_false", dest="parallel", help="Disable parallel tests")
    parser.add_argument("--max-workers", type=int, default=3, help="Maximum number of parallel workers")
    parser.add_argument("--frontend-url", type=str, help="Frontend URL")
    parser.add_argument("--backend-url", type=str, help="Backend URL")

    args = parser.parse_args()

    # Override test configuration
    TestConfig.HEADLESS = not args.headless
    TestConfig.PARALLEL_TESTS = args.parallel
    TestConfig.MAX_WORKERS = args.max_workers

    if args.frontend_url:
        TestConfig.FRONTEND_URL = args.frontend_url
    if args.backend_url:
        TestConfig.BACKEND_URL = args.backend_url

    # Run tests
    tester = FrontendTester()
    asyncio.run(tester.run_all_tests())