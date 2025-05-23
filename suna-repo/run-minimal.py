"""
Minimal Suna backend runner for Tongkeeper integration.

This script runs a simplified version of the Suna backend that can be
integrated with Tongkeeper for basic AI agent capabilities using DeepSeek.
"""

import os
import sys
import logging
import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import uuid
import datetime
from typing import Dict, Any, List, Optional

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger("suna-minimal")

# Load environment variables
load_dotenv()
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")

if not DEEPSEEK_API_KEY:
    logger.error("DEEPSEEK_API_KEY environment variable is not set")
    sys.exit(1)

# Initialize FastAPI
app = FastAPI(title="Suna Minimal API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for conversations
conversations = {}

# Import DeepSeek integration
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from utils.custom_llm_provider import DeepSeekProvider

@app.get("/")
async def root():
    return {"message": "Suna Minimal API is running"}

@app.get("/api/health")
async def health_check():
    """Health check endpoint to verify API is working."""
    logger.info("Health check endpoint called")
    return {
        "status": "ok", 
        "timestamp": datetime.datetime.now().isoformat(),
        "instance_id": "minimal"
    }

@app.post("/api/threads")
async def create_thread(request: Request):
    """Create a new conversation thread."""
    data = await request.json()
    user_id = data.get("userId", "anonymous")

    thread_id = f"thread-{uuid.uuid4()}"

    conversations[thread_id] = {
        "id": thread_id,
        "userId": user_id,
        "title": data.get("title", "New Conversation"),
        "createdAt": datetime.datetime.now().isoformat(),
        "messages": []
    }

    return {
        "threadId": thread_id,
        "userId": user_id,
        "title": conversations[thread_id]["title"],
        "createdAt": conversations[thread_id]["createdAt"]
    }

@app.get("/api/threads")
async def get_threads(userId: str, projectId: Optional[str] = None):
    """Get all threads for a user."""
    user_threads = []

    for thread_id, thread in conversations.items():
        if thread["userId"] == userId:
            user_threads.append({
                "id": thread_id,
                "title": thread["title"],
                "createdAt": thread["createdAt"],
                "userId": userId
            })

    return user_threads

@app.get("/api/threads/{thread_id}")
async def get_thread(thread_id: str, userId: str, projectId: Optional[str] = None):
    """Get a specific thread."""
    if thread_id not in conversations:
        return JSONResponse(status_code=404, content={"message": "Thread not found"})

    thread = conversations[thread_id]
    if thread["userId"] != userId:
        return JSONResponse(status_code=403, content={"message": "Unauthorized"})

    return {
        "id": thread_id,
        "title": thread["title"],
        "createdAt": thread["createdAt"],
        "userId": userId
    }

@app.get("/api/threads/{thread_id}/messages")
async def get_thread_messages(thread_id: str, userId: str, projectId: Optional[str] = None):
    """Get messages for a specific thread."""
    if thread_id not in conversations:
        return JSONResponse(status_code=404, content={"message": "Thread not found"})

    thread = conversations[thread_id]
    if thread["userId"] != userId:
        return JSONResponse(status_code=403, content={"message": "Unauthorized"})

    return thread["messages"]

@app.post("/api/agent/run")
async def run_agent(request: Request):
    """Run the Suna agent."""
    data = await request.json()

    user_id = data.get("userId", "anonymous")
    thread_id = data.get("threadId")

    if not thread_id or thread_id not in conversations:
        # Create a new thread if none exists
        thread_id = f"thread-{uuid.uuid4()}"
        conversations[thread_id] = {
            "id": thread_id,
            "userId": user_id,
            "title": "New Conversation",
            "createdAt": datetime.datetime.now().isoformat(),
            "messages": []
        }

    # Get the input query
    input_query = data.get("input", "")

    # Add user message to thread
    user_message_id = f"msg-{uuid.uuid4()}"
    user_message = {
        "id": user_message_id,
        "content": input_query,
        "role": "user",
        "createdAt": datetime.datetime.now().isoformat()
    }
    conversations[thread_id]["messages"].append(user_message)

    # Create the message list for DeepSeek
    messages = []

    # Add system message
    messages.append({
        "role": "system", 
        "content": """You are Suna, an advanced open-source generalist AI agent designed to help accomplish real-world tasks. 
You are currently running in Tongkeeper, a family-oriented assistant platform.

In your full implementation, you have several powerful capabilities:
1. Browser automation to navigate websites and extract information
2. File management for document creation and editing
3. Web crawling and search capabilities
4. Command-line execution for system tasks
5. Integration with various APIs and services

When responding to users, be:
- Helpful and informative with detailed, accurate responses
- Capable of solving complex problems with step-by-step reasoning
- Knowledgeable about a wide range of topics
- Professional but conversational in tone

If asked about tasks that would normally require your advanced tools (like web search or file creation), explain what capabilities the full Suna agent would use to accomplish the task, then provide the best response you can with your current knowledge."""
    })

    # Add conversation history (up to 10 previous messages)
    for msg in conversations[thread_id]["messages"][-10:]:
        messages.append({"role": msg["role"], "content": msg["content"]})

    try:
        # Call DeepSeek provider
        deepseek_provider = DeepSeekProvider()
        response = await deepseek_provider.generate_response(
            messages=messages,
            temperature=0.7,
            max_tokens=2000
        )

        # Extract the response content
        ai_response = response["choices"][0]["message"]["content"]

        # Add assistant message to thread
        assistant_message_id = f"msg-{uuid.uuid4()}"
        assistant_message = {
            "id": assistant_message_id,
            "content": ai_response,
            "role": "assistant",
            "createdAt": datetime.datetime.now().isoformat()
        }
        conversations[thread_id]["messages"].append(assistant_message)

        # Update the conversation title if this is the first exchange
        if len(conversations[thread_id]["messages"]) == 2:
            # Create a short title based on the first user message
            title_limit = min(len(input_query), 30)
            conversations[thread_id]["title"] = input_query[:title_limit] + ("..." if len(input_query) > 30 else "")

        # Return the response
        return {
            "runId": f"run-{uuid.uuid4()}",
            "status": "completed",
            "threadId": thread_id,
            "projectId": data.get("projectId", "default"),
            "output": ai_response
        }

    except Exception as e:
        logger.error(f"Error generating response: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "message": "Error generating response",
                "error": str(e)
            }
        )

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    logger.info(f"Starting Suna Minimal API on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)