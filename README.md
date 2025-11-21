# Securimate Performance Automation - K6 Framework

> **Clean, Maintainable K6 Performance Testing Framework with Best Practices**

##  Quick Start

### 1. Install K6
```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6

# Verify
k6 version
```

### 2. Set Up Environment Variables
```bash
# Copy the template file
cp .env.template .env

# Edit with your credentials
nano .env
```

### 3. Run Your First Test
```bash
# Quick smoke test
npm run k6:smoke

# Load test against staging
npm run k6:staging
```

## � Project Structure

```
securimate-performance-automation/
 clients/                  # HTTP clients
�    http-client.js        # Enhanced HTTP client with retry
 config/                   # Configuration
�    environment.js        # Environment configs (dev/staging/prod)
�    credentials.js        # Secure token handling
�    test-data.json        # Static test data
 generators/               # Test data generators
�    generators.js         # Data generation utilities
 profiles/                 # Load test profiles
�    load-profiles.js      # Smoke/Load/Stress/Spike scenarios
 reporters/                # Custom reporters
�    reporter.js           # HTML/JSON/CSV report generation
 tests/                    # Test files
�    api/                  # API tests
�   �    third-party.test.js
�   �    client-profile.test.js
�    smoke/                # Smoke tests
�   �    quick-smoke.test.js
�    websocket/            # WebSocket tests (to add)
 reports/                  # Generated reports
�    html/
�    json/
�    csv/
 .gitignore
 package.json
 README.md
```

##  Available Test Commands

```bash
# Smoke Tests (Quick Validation)
npm run k6:smoke                        # Quick smoke test (1 VU, 30s)
npm run k6:smoke:staging                # Smoke test on staging

# API Tests
npm run k6:api:third-party              # Third Party API (load test)
npm run k6:api:third-party:smoke        # Third Party API (smoke)
npm run k6:api:third-party:stress       # Third Party API (stress)
npm run k6:api:client-profile           # Client Profile API

# Environment-Specific
npm run k6:staging                      # Run against staging
npm run k6:production                   # Run against production (smoke only)

# Help
npm run k6:help                         # Show all commands
```

##  Running Tests Directly

```bash
# Basic usage (development - auto-fetches token)
k6 run tests/api/GET_POST_third-party.test.js

# With environment (staging/prod requires credentials)
k6 run -e ENVIRONMENT=staging -e CLIENT_ID=your_id -e CLIENT_SECRET=your_secret tests/api/GET_POST_third-party.test.js

# With load profile
k6 run -e TEST_PROFILE=smoke tests/api/GET_POST_third-party.test.js
k6 run -e TEST_PROFILE=load tests/api/GET_POST_third-party.test.js
k6 run -e TEST_PROFILE=stress tests/api/GET_POST_third-party.test.js
```

##  Environment Variables

| Variable | Options | Default | Description |
|----------|---------|---------|-------------|
| `ENVIRONMENT` | development, staging | development | Target environment |
| `TEST_PROFILE` | smoke, load, stress, spike, soak | load | Load test profile |
| `X_IDENT` | string | k6-performance-test | X-Ident header |
| `TP_REFERENCE_ID` | string | ZP3P-01395 | Third Party reference ID |
| `DEV_CLIENT_ID` | string | - | **Required for dev** - Development API client ID |
| `DEV_CLIENT_SECRET` | string | - | **Required for dev** - Development API client secret |
| `STAGING_CLIENT_ID` | string | - | **Required for staging** - Staging API client ID |
| `STAGING_CLIENT_SECRET` | string | - | **Required for staging** - Staging API client secret |
| `AUTH_TOKEN` | string | - | **Fallback** - Manual token (if API fails) |

### Authentication

The framework automatically fetches access tokens from the API:

**Development** (pre-configured in .env.template):
- Client ID: `Client_ID`
- Token URL: `https://api-dev3.steeleglobal.net/apiauth/token`

**Staging** (requires separate env vars):
```bash
# Set staging-specific environment variables
export STAGING_CLIENT_ID=your_staging_client_id
export STAGING_CLIENT_SECRET=your_staging_client_secret
export ENVIRONMENT=staging

# Or use .env file
echo "STAGING_CLIENT_ID=your_staging_client_id" >> .env
echo "STAGING_CLIENT_SECRET=your_staging_client_secret" >> .env
echo "ENVIRONMENT=staging" >> .env

npm run k6:smoke
```

##  Load Test Profiles

| Profile | VUs | Duration | Description | Use Case |
|---------|-----|----------|-------------|----------|
| **smoke** | 1 | 30s | Quick validation | Pre-deployment checks |
| **load** | 0�10�0 | 9m | Normal traffic | Baseline performance |
| **stress** | 0�100�0 | 26m | Beyond capacity | Find breaking point |
| **spike** | 5�100�5 | 7.5m | Sudden surge | Test elasticity |
| **soak** | 20 | 1h | Extended run | Memory leaks |
| **breakpoint** | 50�500 RPS | 12m | Incremental | Capacity planning |

##  Core Features

### 1. HTTP Client with Auto-Retry
```javascript
import { apiClient } from './lib/api/http-client.js';

// Automatic retry, logging, metrics
const response = apiClient.get('/endpoint');

// POST with form data
const response = apiClient.post('/endpoint', data, { contentType: 'form' });

// Validation
apiClient.validate(response, {
  'status is 200': (r) => r.status === 200,
  'response time OK': (r) => r.timings.duration < 2000,
});
```

### 2. Environment-Based Configuration
```javascript
import { config } from './lib/config/environment.js';

// Automatically uses correct URL based on ENVIRONMENT variable
console.log(config.api.baseUrl);
console.log(config.thresholds);
```

### 3. Data Generators
```javascript
import { generateThirdParty, generateUniqueName } from './lib/data/generators.js';

const data = generateThirdParty({
  officialName: 'CustomName', // Override specific fields
});
```

### 4. Load Profiles
```javascript
import { loadTest, smokeTest, stressTest } from './lib/scenarios/load-profiles.js';

export const options = loadTest(); // Predefined scenarios
```

### 5. Comprehensive Reports
```javascript
import { generateReport } from './lib/utils/reporter.js';

export function handleSummary(data) {
  return generateReport(data, 'my-test');
  // Generates HTML, JSON, and console reports
}
```

##  Writing Tests

### Basic Test Template
```javascript
import { sleep } from 'k6';
import { apiClient } from '../../lib/api/http-client.js';
import { generateReport } from '../../lib/utils/reporter.js';
import { loadTest } from '../../lib/scenarios/load-profiles.js';
import { validateCredentials } from '../../lib/config/credentials.js';

export const options = loadTest();

export function setup() {
  if (!validateCredentials()) {
    throw new Error('Invalid credentials');
  }
  return { setupData: 'value' };
}

export default function(data) {
  const response = apiClient.get('/endpoint');
  
  apiClient.validate(response, {
    'status is 200': (r) => r.status === 200,
  });
  
  sleep(1);
}

export function handleSummary(data) {
  return generateReport(data, 'test-name');
}
```

### Complete Example
See `tests/api/third-party.test.js` for a full working example.

## � Migrating Old Tests

### Old Way (Before)
```javascript
import http from "k6/http";
import { CONFIG } from "C:/absolute/path/config/config.js";

export const options = { vus: 4, iterations: 16 };

export default function() {
  const response = http.get(CONFIG.BASE_URL, { 
    headers: CONFIG.HEADERS 
  });
  check(response, { "status is 200": (r) => r.status === 200 });
}
```

### New Way (After)
```javascript
import { apiClient } from '../../lib/api/http-client.js';
import { loadTest } from '../../lib/scenarios/load-profiles.js';

export const options = loadTest();

export default function() {
  const response = apiClient.get('/rest/thirdparty/profile');
  apiClient.validate(response, { 'status is 200': (r) => r.status === 200 });
}
```

### Key Changes
-  Hardcoded paths �  Relative imports
-  Hardcoded config �  Environment variables
-  Manual HTTP �  Enhanced client with retry
-  Manual options �  Predefined load profiles
-  Basic reports �  Comprehensive reports (HTML/JSON/CSV)

##  Understanding Results

### Console Output
```

 THIRD-PARTY-API-TEST - PERFORMANCE TEST RESULTS


Environment:        STAGING
Test Duration:      540.00s
Max Virtual Users:  10

 REQUEST METRICS:
   Total Requests:     1,234
   Success Rate:       99.03%
   Error Rate:         0.97%
   Throughput:         2.29 req/s

�  RESPONSE TIME METRICS:
   Average:            456.78ms
   P50 (Median):       423.45ms
   P95:                892.34ms
   P99:                1,234.56ms
```

### Report Files
- **HTML**: `reports/html/test-name_timestamp.html` - Interactive visualizations
- **JSON**: `reports/json/test-name_summary_timestamp.json` - KPIs and metrics
- **Console**: Real-time output with color-coded results

## � Troubleshooting

### "Module not found" error
```bash
# Ensure you're in the project root directory
k6 run tests/api/third-party.test.js
```

### "Invalid credentials" error
```bash
# Set AUTH_TOKEN
export AUTH_TOKEN=your_token
# Or inline
AUTH_TOKEN=your_token npm run k6:smoke
```

### Tests timeout or fail
- Check `ENVIRONMENT` variable matches your target
- Verify API endpoint is accessible
- Try with fewer VUs or smoke profile first
- Review environment-specific thresholds in `lib/config/environment.js`

##  Best Practices

### 1. Test Organization
-  Group by type: `api/`, `load/`, `smoke/`
-  Descriptive names: `feature-type.test.js`
-  One feature per file

### 2. Configuration
-  Use environment variables (never commit tokens)
-  Test against non-production first
-  Set realistic thresholds

### 3. Load Testing
-  Start with smoke tests
-  Gradually increase load
-  Monitor system resources
-  Review reports after each run

### 4. Data Management
-  Use data generators for unique data
-  Don't use production data
-  Clean up test data when possible

### 5. Maintenance
-  Use library modules (don't duplicate code)
-  Follow naming conventions
-  Document complex scenarios
-  Keep dependencies updated

##  Framework Components

### Core Modules

**HTTP Client** (`clients/http-client.js`)
- Automatic retry with exponential backoff
- Request/response logging
- Custom metrics collection
- Validation helpers

**Configuration** (`config/`)
- `environment.js` - Multi-environment support
- `credentials.js` - Secure token management

**Data Generators** (`generators/generators.js`)
- `generateThirdParty()` - Third party profiles
- `generateClientProfile()` - Client profiles
- `generateUniqueName()` - Unique identifiers
- More utility functions

**Load Profiles** (`profiles/load-profiles.js`)
- Predefined scenarios (smoke, load, stress, spike, soak, breakpoint)
- Environment-aware configurations
- Customizable options

**Reporter** (`reporters/reporter.js`)
- HTML reports with charts
- JSON reports with KPIs
- CSV exports
- Console summaries

##  Test File Naming Convention

All test files follow this naming pattern:
- **Pattern**: `feature-name.test.js`
- **Examples**:
  - `third-party.test.js` - Third Party API tests
  - `client-profile.test.js` - Client Profile API tests
  - `quick-smoke.test.js` - Smoke tests

This makes it easy to identify test files at a glance.

##  Ready for Git

This framework is **production-ready** and follows best practices:

 Clean, organized structure  
 Modular, reusable components  
 Environment-based configuration  
 No hardcoded credentials  
 Comprehensive documentation  
 Multiple test types supported  
 Rich reporting (HTML/JSON/CSV)  
 Error handling and retry logic  
 Consistent naming conventions  

### Preparing for Git

1. **Ensure `.gitignore` is configured**:
```gitignore
# Environment files
.env
config/.env
k6-tests/config/.env

# Credentials
config/credentials.json

# Reports (optional - you may want to track these)
k6-tests/reports/
reports/

# Node modules
node_modules/

# OS files
.DS_Store
```

2. **Test before pushing**:
```bash
export AUTH_TOKEN=your_token
npm run k6:smoke
```

## � Support & Resources

- **K6 Official Docs**: https://k6.io/docs/
- **Test Examples**: See `k6-tests/tests/` directory
- **Module Documentation**: See inline comments in `k6-tests/lib/`

##  Contributing

When adding new tests:
1. Use the existing structure and conventions
2. Leverage library modules (don't reinvent)
3. Write descriptive test names
4. Test with multiple load profiles
5. Include proper documentation

##  Quick Reference

```bash
# Set up environment
export AUTH_TOKEN=your_token
export ENVIRONMENT=staging

# Run tests
npm run k6:smoke                    # Quick validation
npm run k6:api:third-party          # API load test
npm run k6:staging                  # Staging environment

# Direct k6 commands
cd k6-tests
k6 run -e AUTH_TOKEN=token tests/api/third-party-api.test.js

# With different profiles
k6 run -e AUTH_TOKEN=token -e TEST_PROFILE=smoke tests/api/third-party-api.test.js
k6 run -e AUTH_TOKEN=token -e TEST_PROFILE=load tests/api/third-party-api.test.js
k6 run -e AUTH_TOKEN=token -e TEST_PROFILE=stress tests/api/third-party-api.test.js

# View reports
open reports/html/latest.html
```

##  Summary

This framework provides everything you need for professional K6 performance testing:

- **Modular Architecture**: Reusable components, no code duplication
- **Environment Management**: Easy switching between dev/staging/prod
- **Load Profiles**: Predefined scenarios for different test types
- **Enhanced HTTP Client**: Retry logic, logging, metrics built-in
- **Data Generators**: Realistic test data without manual creation
- **Comprehensive Reports**: HTML, JSON, CSV, and console output
- **Best Practices**: Industry-standard patterns and conventions
- **Developer-Friendly**: Good DX with clear structure and documentation
- **Production-Ready**: Error handling, validation, secure credentials

**Ready to push to Git and start testing!** 

---

*Version: 2.0.0*  
*Last Updated: October 2025*
