"""
Minimal DeerFlow service for testing
"""
from fastapi import FastAPI
import uvicorn

app = FastAPI()

@app.get("/health")
async def health_check():
    """Check if the service is running"""
    return {"status": "ok", "version": "minimal"}

if __name__ == "__main__":
    print("Starting minimal DeerFlow service on port 9000...")
    uvicorn.run(app, host="0.0.0.0", port=9000)