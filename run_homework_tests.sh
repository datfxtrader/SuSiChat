
#!/bin/bash

echo "🚀 Running Homework System Tests"
echo "================================="

# Check if server is running
if ! curl -s http://localhost:5000/api/auth/user > /dev/null; then
    echo "❌ Server is not running. Please start with 'npm run dev'"
    exit 1
fi

echo "✅ Server is running"

# Run homework-specific tests
echo "📚 Running Homework Functionality Tests..."
python test_homework_functionality.py

# Check exit code
if [ $? -eq 0 ]; then
    echo "✅ Homework tests completed successfully"
else
    echo "❌ Homework tests failed"
    exit 1
fi

echo "🎉 All homework tests completed!"
