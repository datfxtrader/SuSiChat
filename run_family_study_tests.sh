
#!/bin/bash

# FamilyStudy Comprehensive Test Runner
# This script runs the complete test suite for the FamilyStudy functionality

echo "🚀 FamilyStudy Comprehensive Test Suite"
echo "========================================"
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is required but not installed."
    exit 1
fi

# Check if required Python packages are available
echo "📦 Checking dependencies..."
python3 -c "import asyncio, json, requests, websocket, sqlite3, psycopg2" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  Some Python packages may be missing. Installing requirements..."
    pip3 install asyncio requests websocket-client psycopg2-binary
fi

# Create test reports directory
mkdir -p test_reports

# Set environment variables for testing
export NODE_ENV=test
export TEST_MODE=true

echo "🧪 Starting FamilyStudy test execution..."
echo ""

# Run the comprehensive test suite
python3 test_family_study_comprehensive.py

# Check test results
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ FamilyStudy test suite completed successfully!"
    echo "📊 Check the generated reports for detailed results."
    echo ""
    echo "Reports generated:"
    ls -la family_study_test_*
else
    echo ""
    echo "❌ FamilyStudy test suite encountered errors."
    echo "📋 Check the error messages above for details."
    exit 1
fi

echo ""
echo "🎯 Test Summary:"
echo "- Database schema validation"
echo "- API endpoint testing (homework & enhanced learning)"
echo "- Language tutor agent functionality"
echo "- Family WebSocket real-time features"
echo "- Learning profile management"
echo "- Content preparation services"
echo "- Frontend component integration"
echo "- End-to-end workflow testing"
echo "- Performance and scalability validation"
echo ""
echo "📈 All FamilyStudy components tested!"
