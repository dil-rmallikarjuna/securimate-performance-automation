FROM grafana/k6:latest-with-browser

# Install dependencies and tools
USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /tests

# Copy test files
COPY . .

# Set user for running tests
USER k6
