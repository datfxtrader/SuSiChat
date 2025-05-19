# Setting Up Suna Backend for Tongkeeper

This guide will walk you through the process of setting up the Suna backend service to enhance your Tongkeeper application with advanced AI agent capabilities.

## Prerequisites

Before you begin, make sure you have the following:

- Docker and Docker Compose installed
- Git installed
- A server or cloud instance to host the Suna backend
- API keys for LLM providers (recommended: Anthropic or OpenAI)
- API keys for search and web scraping tools (Tavily and Firecrawl)
- Daytona account for secure agent execution

## Step 1: Clone the Suna Repository

```bash
git clone https://github.com/kortix-ai/suna.git
cd suna
```

## Step 2: Run the Setup Wizard

Suna comes with a convenient setup wizard that will guide you through the configuration process:

```bash
python setup.py
```

During the setup, you'll need to provide:
- Supabase configuration for database and authentication
- Redis configuration for caching
- LLM API keys (Anthropic, OpenAI, etc.)
- Search API keys (Tavily)
- Web scraping configuration (Firecrawl)
- Daytona API key

## Step 3: Start the Suna Service

After completing the setup, you can start the Suna service:

```bash
python start.py
```

This will launch the Suna backend service, typically on port 8000.

## Step 4: Configure Tongkeeper to Use Suna

With Suna running, you need to configure Tongkeeper to use it. Add the following environment variables to your Tongkeeper application:

```
SUNA_API_URL=http://<your-suna-host>:8000
USE_MOCK_SUNA=false
SUNA_PROJECT_ID=tongkeeper-default
SUNA_API_KEY=<your-suna-api-key>  # If you configured authentication on Suna
```

## Step 5: Verifying the Connection

To verify that Tongkeeper is properly connected to Suna:

1. Restart your Tongkeeper application
2. Check the server logs to confirm it's connecting to the Suna API
3. Navigate to the Suna Agent page in the Tongkeeper UI
4. Try sending a message to test the connection

## Using Suna's Advanced Features

With the full Suna integration, you'll have access to:

1. **Browser Automation**: Suna can navigate websites and extract information
   ```
   Find the latest news about artificial intelligence
   ```

2. **File Management**: Create and edit documents
   ```
   Create a report about climate change trends
   ```

3. **Web Search**: Access to multiple search engines and data sources
   ```
   Research the effects of coffee on productivity
   ```

4. **Advanced Problem Solving**: Multi-step reasoning to solve complex problems
   ```
   Help me analyze this dataset and draw conclusions
   ```

5. **API Integration**: Integrate with various services and APIs
   ```
   Check the weather forecast for New York this weekend
   ```

## Troubleshooting

If you encounter issues with your Suna integration:

1. Check the Suna logs for any errors:
   ```bash
   docker logs suna-backend
   ```

2. Verify that your API keys are valid and have sufficient credits

3. Ensure the Tongkeeper application can reach the Suna service (network connectivity)

4. Check the Supabase database connection

5. Verify that the Redis service is running properly

For more detailed information, refer to the [Suna documentation](https://github.com/kortix-ai/suna/docs).