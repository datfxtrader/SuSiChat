
# Port Configuration Guide

This document outlines the port allocation for the DeerFlow application to prevent conflicts.

## Port Allocation

- **Port 3000**: Main Express.js backend server (API and static files)
- **Port 5173**: Vite development server (frontend in development)
- **Port 9000**: DeerFlow research service (Python FastAPI)

## Important Notes

1. **Port 5000 is reserved** for production deployment and should not be used in development
2. All internal service communications should use `0.0.0.0` instead of `localhost`
3. Frontend development uses port 5173 (Vite default)
4. Backend API is always on port 3000
5. DeerFlow service is always on port 9000

## Environment Variables

```bash
BACKEND_URL=http://0.0.0.0:3000
FRONTEND_URL=http://0.0.0.0:5173  # Development
DEERFLOW_URL=http://0.0.0.0:9000
```

## Test Configuration

All test files should use these port configurations:
- Backend tests: `http://0.0.0.0:3000`
- Frontend tests: `http://0.0.0.0:5173`
- DeerFlow tests: `http://0.0.0.0:9000`
