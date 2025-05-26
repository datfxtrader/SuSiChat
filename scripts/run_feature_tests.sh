
#!/bin/bash

# Global Feature Testing Script
# Applies DeerFlow testing standards to any feature

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Global Feature Testing Framework${NC}"
echo "=================================="

# Function to run tests for a specific feature
run_feature_tests() {
    local feature_name=$1
    local test_file=$2
    
    echo -e "\n${BLUE}Testing Feature: ${feature_name}${NC}"
    echo "----------------------------------------"
    
    # Check if test file exists
    if [[ ! -f "$test_file" ]]; then
        echo -e "${RED}❌ Test file not found: $test_file${NC}"
        return 1
    fi
    
    # Determine test type and run appropriately
    if [[ "$test_file" == *.py ]]; then
        echo -e "${YELLOW}🐍 Running Python tests...${NC}"
        python3 "$test_file"
    elif [[ "$test_file" == *.ts ]]; then
        echo -e "${YELLOW}📘 Running TypeScript tests...${NC}"
        npx tsx "$test_file"
    elif [[ "$test_file" == *.js ]]; then
        echo -e "${YELLOW}📦 Running JavaScript tests...${NC}"
        node "$test_file"
    else
        echo -e "${RED}❌ Unsupported test file type: $test_file${NC}"
        return 1
    fi
    
    local exit_code=$?
    
    if [[ $exit_code -eq 0 ]]; then
        echo -e "${GREEN}✅ ${feature_name} tests completed successfully!${NC}"
    else
        echo -e "${RED}❌ ${feature_name} tests failed!${NC}"
    fi
    
    return $exit_code
}

# Function to check if servers are running
check_servers() {
    echo -e "${BLUE}🔍 Checking server status...${NC}"
    
    # Check backend
    if curl -s http://0.0.0.0:3000/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend server (port 3000) is running${NC}"
        BACKEND_RUNNING=true
    else
        echo -e "${RED}❌ Backend server is not running${NC}"
        BACKEND_RUNNING=false
    fi
    
    # Check frontend (if needed)
    if curl -s http://0.0.0.0:5000/ >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend server (port 5000) is running${NC}"
        FRONTEND_RUNNING=true
    else
        echo -e "${YELLOW}⚠️ Frontend server is not running (some tests may be limited)${NC}"
        FRONTEND_RUNNING=false
    fi
}

# Function to run all available feature tests
run_all_tests() {
    echo -e "${BLUE}🚀 Running all feature tests...${NC}"
    
    local tests_passed=0
    local tests_failed=0
    
    # SuSi Chat tests
    if [[ -f "test_global_standards.py" ]]; then
        if run_feature_tests "SuSi Chat" "test_global_standards.py"; then
            ((tests_passed++))
        else
            ((tests_failed++))
        fi
    fi
    
    # DeerFlow tests
    if [[ -f "test_complete_app_functionality.py" ]]; then
        if run_feature_tests "DeerFlow Core" "test_complete_app_functionality.py"; then
            ((tests_passed++))
        else
            ((tests_failed++))
        fi
    fi
    
    # Research Agent tests
    if [[ -f "client/src/tests/suites/susiChat.test.ts" ]]; then
        if run_feature_tests "Research Agent" "client/src/tests/suites/susiChat.test.ts"; then
            ((tests_passed++))
        else
            ((tests_failed++))
        fi
    fi
    
    # Vietnamese Chat tests
    if [[ -f "test_vietnamese_chatbot_comprehensive.py" ]]; then
        if run_feature_tests "Vietnamese Chat" "test_vietnamese_chatbot_comprehensive.py"; then
            ((tests_passed++))
        else
            ((tests_failed++))
        fi
    fi
    
    # Summary
    echo -e "\n${BLUE}📊 Test Summary${NC}"
    echo "==============="
    echo -e "✅ Passed: ${tests_passed}"
    echo -e "❌ Failed: ${tests_failed}"
    echo -e "Total: $((tests_passed + tests_failed))"
    
    if [[ $tests_failed -eq 0 ]]; then
        echo -e "\n${GREEN}🎉 All tests passed!${NC}"
        return 0
    else
        echo -e "\n${RED}💥 Some tests failed!${NC}"
        return 1
    fi
}

# Function to create test template for new features
create_test_template() {
    local feature_name=$1
    
    if [[ -z "$feature_name" ]]; then
        echo -e "${RED}❌ Please provide a feature name${NC}"
        echo "Usage: $0 template <feature_name>"
        return 1
    fi
    
    local test_file="test_${feature_name,,}.py"
    
    cat > "$test_file" << EOF
#!/usr/bin/env python3
"""
${feature_name} Test Suite
Generated using Global Testing Standards
"""

import asyncio
import sys
import os

# Add the parent directory to the path to import global test framework
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from test_global_standards import GlobalTestFramework, TestConfig, TestResult, TestStatus, TestUtils

async def test_${feature_name,,}_functionality():
    """Test ${feature_name} feature using global standards"""
    
    framework = GlobalTestFramework(TestConfig(base_url="http://0.0.0.0:3000"))
    
    async def test_${feature_name,,}_health():
        """Test ${feature_name} health check"""
        result = await TestUtils.test_api_endpoint("http://0.0.0.0:3000/health")
        
        return TestResult(
            name="${feature_name} Health Check",
            status=TestStatus.PASSED if result["success"] else TestStatus.FAILED,
            duration=0,
            details=result,
            error=None if result["success"] else "Health check failed"
        )
    
    async def test_${feature_name,,}_api():
        """Test ${feature_name} API endpoints"""
        # Add your specific API tests here
        result = await TestUtils.test_api_endpoint("http://0.0.0.0:3000/api/${feature_name,,}")
        
        return TestResult(
            name="${feature_name} API Test",
            status=TestStatus.PASSED if result["success"] else TestStatus.FAILED,
            duration=0,
            details=result,
            error=None if result["success"] else "API test failed"
        )
    
    async def test_${feature_name,,}_performance():
        """Test ${feature_name} performance"""
        async def api_request():
            return await TestUtils.test_api_endpoint("http://0.0.0.0:3000/api/${feature_name,,}")
        
        perf_result = await TestUtils.test_performance(api_request, iterations=5)
        is_performant = perf_result.get("avg_time", 0) < 2.0
        
        return TestResult(
            name="${feature_name} Performance Test",
            status=TestStatus.PASSED if is_performant else TestStatus.WARNING,
            duration=0,
            details=perf_result,
            warnings=[] if is_performant else ["Performance below threshold"]
        )
    
    # Run the test suite
    tests = [test_${feature_name,,}_health, test_${feature_name,,}_api, test_${feature_name,,}_performance]
    return await framework.run_test_suite("${feature_name}", tests)

if __name__ == "__main__":
    asyncio.run(test_${feature_name,,}_functionality())
EOF
    
    chmod +x "$test_file"
    echo -e "${GREEN}✅ Test template created: $test_file${NC}"
    echo -e "${YELLOW}📝 Edit the file to add your specific tests${NC}"
}

# Main script logic
case "${1:-all}" in
    "all")
        check_servers
        if [[ "$BACKEND_RUNNING" == "false" ]]; then
            echo -e "${RED}❌ Backend server is required for testing${NC}"
            exit 1
        fi
        run_all_tests
        ;;
    "susi"|"SuSi")
        check_servers
        run_feature_tests "SuSi Chat" "test_global_standards.py"
        ;;
    "deerflow"|"DeerFlow")
        check_servers
        run_feature_tests "DeerFlow Core" "test_complete_app_functionality.py"
        ;;
    "template")
        create_test_template "$2"
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [option]"
        echo ""
        echo "Options:"
        echo "  all          Run all available feature tests (default)"
        echo "  susi         Run SuSi Chat tests only"
        echo "  deerflow     Run DeerFlow core tests only"
        echo "  template     Create test template for new feature"
        echo "  help         Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 all                    # Run all tests"
        echo "  $0 susi                   # Test SuSi Chat only"
        echo "  $0 template MyFeature     # Create test template"
        ;;
    *)
        echo -e "${RED}❌ Unknown option: $1${NC}"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
