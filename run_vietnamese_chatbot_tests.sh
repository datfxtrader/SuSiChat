
#!/bin/bash

# Vietnamese Chatbot Test Suite Runner
# Runs comprehensive tests for the Vietnamese-focused chatbot system

echo "🚀 Vietnamese Chatbot Test Suite Runner"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Check if servers are running
check_servers() {
    print_status $BLUE "🔍 Checking server status..."
    
    # Check backend
    if curl -s http://0.0.0.0:3000/health >/dev/null 2>&1; then
        print_status $GREEN "✅ Backend server (port 3000) is running"
        BACKEND_RUNNING=true
    elif curl -s http://0.0.0.0:9000/health >/dev/null 2>&1; then
        print_status $GREEN "✅ Backend server (port 9000) is running"
        BACKEND_RUNNING=true
    else
        print_status $RED "❌ Backend server is not running"
        BACKEND_RUNNING=false
    fi
    
    # Check frontend
    if curl -s http://0.0.0.0:5000/ >/dev/null 2>&1; then
        print_status $GREEN "✅ Frontend server (port 5000) is running"
        FRONTEND_RUNNING=true
    else
        print_status $YELLOW "⚠️ Frontend server is not running (some tests may be limited)"
        FRONTEND_RUNNING=false
    fi
}

# Install dependencies if needed
install_dependencies() {
    print_status $BLUE "📦 Checking test dependencies..."
    
    # Check Python dependencies
    python3 -c "import requests, asyncio, aiohttp" 2>/dev/null
    if [ $? -ne 0 ]; then
        print_status $YELLOW "Installing required Python packages..."
        pip install requests aiohttp asyncio
    fi
    
    # Check for optional browser automation
    python3 -c "import playwright" 2>/dev/null
    if [ $? -eq 0 ]; then
        print_status $GREEN "✅ Playwright available for advanced UI testing"
    else
        python3 -c "import selenium" 2>/dev/null
        if [ $? -eq 0 ]; then
            print_status $GREEN "✅ Selenium available for UI testing"
        else
            print_status $YELLOW "⚠️ No browser automation available (basic tests only)"
        fi
    fi
}

# Run comprehensive tests
run_comprehensive_tests() {
    print_status $BLUE "🧪 Running Comprehensive Vietnamese Chatbot Tests..."
    echo ""
    
    python3 test_vietnamese_chatbot_comprehensive.py
    COMPREHENSIVE_RESULT=$?
    
    if [ $COMPREHENSIVE_RESULT -eq 0 ]; then
        print_status $GREEN "✅ Comprehensive tests PASSED"
    else
        print_status $RED "❌ Comprehensive tests FAILED"
    fi
    
    return $COMPREHENSIVE_RESULT
}

# Run UI tests
run_ui_tests() {
    print_status $BLUE "🎨 Running UI Component Tests..."
    echo ""
    
    python3 test_vietnamese_ui_components.py
    UI_RESULT=$?
    
    if [ $UI_RESULT -eq 0 ]; then
        print_status $GREEN "✅ UI tests PASSED"
    else
        print_status $RED "❌ UI tests FAILED"
    fi
    
    return $UI_RESULT
}

# Run integration tests with existing DeerFlow system
run_integration_tests() {
    print_status $BLUE "🔗 Running Integration Tests..."
    echo ""
    
    # Test DeerFlow integration if available
    if [ -f "test_complete_app_functionality.py" ]; then
        print_status $BLUE "Running DeerFlow integration test..."
        python3 test_complete_app_functionality.py
        INTEGRATION_RESULT=$?
        
        if [ $INTEGRATION_RESULT -eq 0 ]; then
            print_status $GREEN "✅ DeerFlow integration tests PASSED"
        else
            print_status $YELLOW "⚠️ DeerFlow integration tests had issues"
        fi
    else
        print_status $YELLOW "⚠️ DeerFlow integration test not found"
        INTEGRATION_RESULT=1
    fi
    
    return $INTEGRATION_RESULT
}

# Generate test summary
generate_summary() {
    local comprehensive=$1
    local ui=$2
    local integration=$3
    
    echo ""
    print_status $BLUE "📊 TEST SUMMARY"
    print_status $BLUE "==============="
    
    # Calculate overall score
    local total_tests=0
    local passed_tests=0
    
    # Comprehensive tests (weight: 50%)
    total_tests=$((total_tests + 50))
    if [ $comprehensive -eq 0 ]; then
        passed_tests=$((passed_tests + 50))
        print_status $GREEN "✅ Comprehensive Tests (50%): PASSED"
    else
        print_status $RED "❌ Comprehensive Tests (50%): FAILED"
    fi
    
    # UI tests (weight: 30%)
    total_tests=$((total_tests + 30))
    if [ $ui -eq 0 ]; then
        passed_tests=$((passed_tests + 30))
        print_status $GREEN "✅ UI Component Tests (30%): PASSED"
    else
        print_status $RED "❌ UI Component Tests (30%): FAILED"
    fi
    
    # Integration tests (weight: 20%)
    total_tests=$((total_tests + 20))
    if [ $integration -eq 0 ]; then
        passed_tests=$((passed_tests + 20))
        print_status $GREEN "✅ Integration Tests (20%): PASSED"
    else
        print_status $YELLOW "⚠️ Integration Tests (20%): ISSUES DETECTED"
    fi
    
    # Calculate percentage
    local percentage=$((passed_tests * 100 / total_tests))
    
    echo ""
    if [ $percentage -ge 80 ]; then
        print_status $GREEN "🎉 OVERALL RESULT: EXCELLENT ($percentage%)"
        print_status $GREEN "Vietnamese chatbot is ready for production!"
    elif [ $percentage -ge 60 ]; then
        print_status $YELLOW "⚠️ OVERALL RESULT: GOOD ($percentage%)"
        print_status $YELLOW "Minor issues detected, but core functionality works"
    else
        print_status $RED "🚨 OVERALL RESULT: NEEDS IMPROVEMENT ($percentage%)"
        print_status $RED "Significant issues detected, review failed tests"
    fi
    
    echo ""
    print_status $BLUE "📋 Next Steps:"
    if [ $comprehensive -ne 0 ]; then
        echo "   • Fix core backend functionality and API endpoints"
    fi
    if [ $ui -ne 0 ]; then
        echo "   • Improve frontend UI components and user experience"
    fi
    if [ $integration -ne 0 ]; then
        echo "   • Review integration with existing systems"
    fi
    
    if [ $percentage -ge 80 ]; then
        echo "   • Consider adding advanced features (voice, video, etc.)"
        echo "   • Set up production monitoring and analytics"
    fi
    
    echo ""
    print_status $BLUE "📁 Test reports and logs are available in the current directory"
}

# Main execution
main() {
    echo ""
    print_status $BLUE "Starting Vietnamese Chatbot Test Suite..."
    echo ""
    
    # Pre-flight checks
    check_servers
    install_dependencies
    
    if [ "$BACKEND_RUNNING" = false ]; then
        print_status $RED "❌ Cannot run tests without backend server"
        print_status $YELLOW "Please start your backend server and try again"
        exit 1
    fi
    
    echo ""
    print_status $BLUE "🚀 All systems ready, starting tests..."
    echo ""
    
    # Run test suites
    run_comprehensive_tests
    COMP_RESULT=$?
    
    echo ""
    run_ui_tests
    UI_RESULT=$?
    
    echo ""
    run_integration_tests
    INT_RESULT=$?
    
    # Generate summary
    generate_summary $COMP_RESULT $UI_RESULT $INT_RESULT
    
    # Exit with appropriate code
    if [ $COMP_RESULT -eq 0 ] && [ $UI_RESULT -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Parse command line arguments
case "${1:-all}" in
    "comprehensive")
        check_servers
        install_dependencies
        run_comprehensive_tests
        exit $?
        ;;
    "ui")
        check_servers
        install_dependencies
        run_ui_tests
        exit $?
        ;;
    "integration")
        check_servers
        install_dependencies
        run_integration_tests
        exit $?
        ;;
    "all"|*)
        main
        ;;
esac
