# Installation Guide

## Prerequisites

### System Requirements
- **Node.js**: Version 16.0.0 or higher
- **K6**: Version 0.45.0 or higher
- **Git**: For version control
- **Docker**: Optional, for containerized testing

### Operating System Support
- macOS 10.15+
- Windows 10+
- Linux (Ubuntu 18.04+, CentOS 7+)

## Installation Steps

### 1. Install K6

#### macOS (using Homebrew)
```bash
brew install k6
```

#### Windows (using Chocolatey)
```bash
choco install k6
```

#### Linux (using package manager)
```bash
# Ubuntu/Debian
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# CentOS/RHEL
sudo dnf install https://dl.k6.io/rpm/repo.rpm
sudo dnf install k6
```

#### Using Binary (All platforms)
1. Download from [K6 Releases](https://github.com/grafana/k6/releases)
2. Extract to a directory in your PATH
3. Verify installation: `k6 version`

### 2. Clone Repository

```bash
git clone https://github.com/dil-rmallikarjuna/securimate-performance-automation.git
cd securimate-performance-automation
```

### 3. Setup Framework

```bash
# Run setup script
npm run setup

# Copy environment template
cp .env.template .env

# Edit .env with your credentials
nano .env  # or use your preferred editor
```

### 4. Verify Installation

```bash
# Check K6 installation
k6 version

# Run smoke test
npm run test:smoke
```

## Environment Configuration

### Required Environment Variables

Edit your `.env` file with the following required variables:

```bash
# User Credentials
USER1_EMAIL=your.email@company.com
USER1_PASSWORD=your_password
USER2_EMAIL=another.email@company.com
USER2_PASSWORD=another_password

# Optional: Admin credentials
ADMIN_EMAIL=admin@company.com
ADMIN_PASSWORD=admin_password

# API Configuration (optional overrides)
AUTH_TOKEN=your_auth_token
API_KEY=your_api_key
BEARER_TOKEN=your_bearer_token

# Test Configuration
ENVIRONMENT=development  # development, staging, production
TEST_PROFILE=smoke      # smoke, load, stress, spike, soak
BROWSER_PROFILE=headless # headless, headed, mobile, tablet
LOG_LEVEL=INFO          # DEBUG, INFO, WARN, ERROR
```

### Environment-Specific URLs

The framework automatically configures URLs based on the environment:

- **Development**: `https://dev3.steeleglobal.net`
- **Staging**: `https://staging.steeleglobal.net`
- **Production**: `https://steeleglobal.net`

You can override these in your `.env` file:

```bash
API_BASE_URL=https://custom-api.example.com
UI_BASE_URL=https://custom-ui.example.com
```

## Docker Setup (Optional)

### Build Docker Image

```bash
npm run docker:build
```

### Run Tests in Docker

```bash
# Run API tests
npm run docker:run

# Run UI tests
npm run docker:run:ui

# Custom command
docker run --rm -v $(pwd)/reports:/app/reports \
  -e ENVIRONMENT=staging \
  -e TEST_PROFILE=load \
  securimate-perf-tests
```

## Troubleshooting

### Common Issues

#### K6 Not Found
```bash
# Check if K6 is in PATH
which k6

# If not found, add to PATH or reinstall
export PATH=$PATH:/path/to/k6
```

#### Permission Denied
```bash
# Make scripts executable
chmod +x scripts/*.js

# Fix directory permissions
sudo chown -R $USER:$USER .
```

#### Browser Tests Failing
```bash
# Install browser dependencies (Linux)
sudo apt-get install -y \
  libnss3 \
  libatk-bridge2.0-0 \
  libdrm2 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libgbm1 \
  libxss1 \
  libasound2
```

#### Network Issues
```bash
# Test connectivity
curl -I https://dev3.steeleglobal.net

# Check proxy settings
echo $HTTP_PROXY
echo $HTTPS_PROXY
```

### Getting Help

1. **Check Logs**: Look in the `logs/` directory for detailed error information
2. **Verbose Mode**: Run tests with `--verbose` flag for more output
3. **Debug Mode**: Set `LOG_LEVEL=DEBUG` in your `.env` file
4. **Screenshots**: UI test failures automatically capture screenshots in `reports/screenshots/`

### Validation

Run the validation script to check your setup:

```bash
node scripts/validate.js
```

This will check:
- K6 installation and version
- Environment variables
- Network connectivity
- Directory permissions
- Sample test execution

## Next Steps

Once installation is complete:

1. **Read the [User Guide](../guides/user-guide.md)** for detailed usage instructions
2. **Review [Test Examples](../guides/test-examples.md)** to understand the framework
3. **Check [API Documentation](../api/README.md)** for advanced customization
4. **Run your first test**: `npm run test:smoke`


