FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app

# Pre-cache the application dependencies
COPY uv.lock pyproject.toml ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-install-project

# Copy the application into the container
COPY . /app

# Install the application dependencies
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked

# Create a log directory and file with appropriate permissions
RUN mkdir -p /var/log/deerflow && \
    touch /var/log/deerflow/deerflow.log && \
    chmod 777 /var/log/deerflow/deerflow.log

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV LOG_PATH=/var/log/deerflow/deerflow.log

# Expose the port the app runs on
EXPOSE 8000

# Run the application
CMD ["uv", "run", "python", "main.py", "--host", "0.0.0.0", "--port", "8000", "--log-level", "info"]