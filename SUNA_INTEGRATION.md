# Suna Integration with Tongkeeper

This document outlines the integration of the Suna open source generalist AI agent with the Tongkeeper application.

## Overview

[Suna](https://github.com/kortix-ai/suna) is a powerful open source generalist AI agent that provides enhanced capabilities for the Tongkeeper assistant. The integration allows Tongkeeper to leverage Suna's advanced features including:

- Browser automation
- File management
- Web crawling and extended search
- Command-line execution
- API integration
- Complex problem-solving

## Architecture

The integration follows a client-server architecture:

1. **Tongkeeper Backend (Node.js/Express)** - Acts as an API gateway to the Suna service
2. **Suna Backend (Python/FastAPI)** - Handles the AI agent operations and LLM interactions
3. **Suna Agent (Docker)** - Provides an isolated environment for executing agent tasks
4. **Tongkeeper Frontend (React)** - Provides the user interface for interacting with Suna

## Setup Requirements

### 1. Install and Configure Suna Backend

Clone the Suna repository and set up the backend service:

```bash
git clone https://github.com/kortix-ai/suna.git
cd suna
# Follow Suna installation instructions
```

Configure environment variables for Suna in a `.env` file within the Suna backend directory.

### 2. Configure Tongkeeper Integration

The Tongkeeper application needs to know how to communicate with the Suna backend:

```
# Add to Tongkeeper environment variables
SUNA_API_URL=http://localhost:8000  # Replace with your Suna backend URL
```

## Usage

1. Start the Suna backend service
2. Start the Tongkeeper application
3. Navigate to the "Suna Agent" section in the Tongkeeper UI
4. Interact with Suna through the provided chat interface

## API Endpoints

The following endpoints have been added to the Tongkeeper API to facilitate Suna integration:

- `POST /api/suna/message` - Send a message to the Suna agent
- `GET /api/suna/conversations/:conversationId` - Retrieve conversation history

## Frontend Components

- `SunaChat` - Main chat interface component for interacting with Suna
- `useSuna` - React hook for managing Suna state and API communication

## Future Enhancements

- Add support for file uploads to Suna
- Implement streaming responses for a more interactive experience
- Add authentication between Tongkeeper and Suna backends
- Develop specialized UIs for different Suna capabilities (browser, file management, etc.)