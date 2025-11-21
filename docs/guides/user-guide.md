# User Guide

## Overview

The Securimate Performance Testing Framework is a comprehensive solution for testing the performance of the Securimate application. It supports both API and UI testing with advanced reporting, metrics collection, and multi-environment support.

## Framework Architecture

```
src/
 core/
‚    base/           # Base classes for all test types
‚    services/       # Core services (Config, Auth, etc.)
‚    helpers/        # Utility helpers (Logger, Metrics, etc.)
 tests/
‚    api/           # API test implementations
‚    ui/            # UI test implementations
‚    integration/   # Integration tests
‚    examples/      # Example test files
 pages/             # Page objects for UI tests
 utils/             # Framework utilities
 config/            # Configuration files
 data/              # Test data and fixtures
```

## Quick Start

### Running Tests

```bash
# Smoke test (quick validation)
npm run test:smoke

# Load test (sustained load)
npm run test:load

# Stress test (high load)
npm run test:stress

# UI performance test
npm run test:ui

# Test against different environments
npm run test:staging
npm run test:production
```

### Basic Test Execution

```bash
# Run with custom environment
k6 run --env ENVIRONMENT=staging src/tests/examples/api-third-party-load-test.js

# Run with custom test profile
k6 run --env TEST_PROFILE=load src/tests/examples/api-third-party-load-test.js

# Run UI test with headed browser
k6 run --env BROWSER_PROFILE=headed src/tests/examples/ui-login-performance-test.js
```

## Test Types

### 1. API Tests

API tests focus on backend performance and functionality:

```javascript
import { ThirdPartyApiTest } from '../api/ThirdPartyApiTest.js';

export default async function() {
    const apiTest = new ThirdPartyApiTest();
    
    // Test CRUD operations
    const profileId = await apiTest.testCreateWorkflow();
    await apiTest.testUpdateWorkflow(profileId);
    await apiTest.cleanup([profileId]);
}
```

**Features:**
- Automatic authentication handling
- Request/response validation
- Performance metrics collection
- Error handling and retry logic

### 2. UI Tests

UI tests focus on frontend performance and user experience:

```javascript
import { LoginUiTest } from '../ui/LoginUiTest.js';

export default async function() {
    const uiTest = new LoginUiTest();
    await uiTest.setup();
    
    // Test login performance
    await uiTest.testSuccessfulLogin('user1');
    await uiTest.testPagePerformance();
    
    await uiTest.teardown();
}
```

**Features:**
- Browser automation with K6 browser
- Page object model
- Screenshot capture on failures
- Performance metrics (FCP, LCP, etc.)

### 3. Integration Tests

Integration tests combine API and UI testing:

```javascript
// Test end-to-end workflow
await loginUiTest.testSuccessfulLogin();
await apiTest.createThirdParty();
await dashboardPage.validateThirdPartyAppears();
```

## Configuration

### Environment Configuration

The framework supports multiple environments with different configurations:

```javascript
// src/config/environments.js
export const environments = {
    development: {
        api: { baseUrl: 'https://api-dev3.steeleglobal.net' },
        ui: { baseUrl: 'https://dev3.steeleglobal.net' },
        thresholds: { http_req_duration: ['p(95)<3000'] }
    },
    staging: {
        api: { baseUrl: 'https://api-staging.steeleglobal.net' },
        ui: { baseUrl: 'https://staging.steeleglobal.net' },
        thresholds: { http_req_duration: ['p(95)<2500'] }
    }
};
```

### Test Profiles

Different test profiles for various testing scenarios:

```javascript
export const testProfiles = {
    smoke: {
        scenarios: {
            smoke_test: {
                executor: 'shared-iterations',
                vus: 1,
                iterations: 1
            }
        }
    },
    load: {
        scenarios: {
            load_test: {
                executor: 'ramping-vus',
                stages: [
                    { duration: '2m', target: 10 },
                    { duration: '5m', target: 10 },
                    { duration: '2m', target: 0 }
                ]
            }
        }
    }
};
```

## Writing Tests

### Creating API Tests

1. **Extend BaseApiTest**:

```javascript
import { BaseApiTest } from '../../core/base/BaseApiTest.js';

export class MyApiTest extends BaseApiTest {
    constructor() {
        super('MyApiTest');
    }
    
    async testMyEndpoint() {
        const response = await this.get('/my-endpoint');
        this.validateApiResponse(response, 200);
        return this.parseJsonResponse(response);
    }
}
```

2. **Use in Test File**:

```javascript
import { MyApiTest } from '../api/MyApiTest.js';

export const options = {
    scenarios: {
        my_test: {
            executor: 'constant-vus',
            vus: 5,
            duration: '1m'
        }
    }
};

let apiTest;

export function setup() {
    apiTest = new MyApiTest();
    return apiTest.setup();
}

export default async function() {
    await apiTest.testMyEndpoint();
}
```

### Creating UI Tests

1. **Create Page Object**:

```javascript
import { BasePage } from './BasePage.js';

export class MyPage extends BasePage {
    constructor(page) {
        super(page, 'MyPage');
        this.selectors = {
            submitButton: '#submit-btn',
            nameInput: 'input[name="name"]'
        };
    }
    
    async fillForm(name) {
        await this.fillInput(this.selectors.nameInput, name);
        await this.clickElement(this.selectors.submitButton);
    }
}
```

2. **Create UI Test**:

```javascript
import { BaseUiTest } from '../../core/base/BaseUiTest.js';
import { MyPage } from '../../pages/MyPage.js';

export class MyUiTest extends BaseUiTest {
    constructor() {
        super('MyUiTest');
    }
    
    async setup() {
        await super.setup();
        this.myPage = new MyPage(this.page);
        return { myPage: this.myPage };
    }
    
    async testFormSubmission() {
        await this.myPage.navigateTo('https://example.com/form');
        await this.myPage.fillForm('Test Name');
        // Add validations...
    }
}
```

## Authentication

The framework handles authentication automatically:

### Setting Up Credentials

```bash
# In .env file
USER1_EMAIL=test@example.com
USER1_PASSWORD=password123
AUTH_TOKEN=your_api_token
```

### Using Authentication in Tests

```javascript
// API tests - automatic header injection
const response = await this.get('/protected-endpoint');

// UI tests - login helper
await this.loginPage.loginWithUser('user1');

// Manual token management
this.authManager.setToken('customToken', 'value');
const headers = this.authManager.getAuthHeaders();
```

## Metrics and Reporting

### Built-in Metrics

The framework automatically collects:
- HTTP request duration and success rates
- Page load times and web vitals
- Custom business metrics
- Error rates and types

### Custom Metrics

```javascript
// Record custom metrics
this.recordMetric('custom_operation_time', duration, { 
    operation: 'data_processing',
    user_type: 'premium' 
});

// Record business metrics
this.recordBusinessMetric('orders_processed', orderCount, 'count');

// Record SLA compliance
this.recordSlaMetric('response_time', responseTime, 2000);
```

### Report Formats

Tests generate multiple report formats:
- **HTML**: Interactive reports with charts and screenshots
- **JSON**: Machine-readable data for CI/CD integration
- **JUnit XML**: For test result integration
- **Console**: Real-time feedback during test execution

## Best Practices

### Test Organization

1. **Group by Feature**: Organize tests by application features
2. **Use Page Objects**: For UI tests, use the page object pattern
3. **Shared Setup**: Use setup/teardown functions for common operations
4. **Data Management**: Keep test data separate from test logic

### Performance Considerations

1. **Realistic Load**: Model tests after real user behavior
2. **Gradual Ramp-up**: Use ramping stages to simulate realistic load increases
3. **Think Time**: Add realistic delays between user actions
4. **Resource Cleanup**: Always clean up test data

### Error Handling

1. **Graceful Failures**: Handle errors gracefully and provide meaningful messages
2. **Screenshots**: UI tests automatically capture screenshots on failures
3. **Retry Logic**: Use built-in retry mechanisms for flaky operations
4. **Logging**: Use appropriate log levels for debugging

### Environment Management

1. **Environment Isolation**: Keep environments separate and well-defined
2. **Configuration**: Use environment-specific configurations
3. **Secrets Management**: Never commit credentials to version control
4. **Validation**: Validate environment setup before running tests

## Troubleshooting

### Common Issues

#### Test Failures
```bash
# Check logs for detailed error information
tail -f logs/test.log

# Run with debug logging
LOG_LEVEL=DEBUG npm run test:smoke

# Check screenshots for UI test failures
ls reports/screenshots/
```

#### Performance Issues
```bash
# Monitor resource usage
k6 run --out json=results.json test.js

# Analyze results
jq '.metrics.http_req_duration.values' results.json
```

#### Authentication Problems
```bash
# Validate credentials
node -e "console.log(process.env.USER1_EMAIL)"

# Test authentication manually
curl -H "Authorization: Bearer $AUTH_TOKEN" https://api.example.com/test
```

### Debug Mode

Enable debug mode for detailed logging:

```bash
# Set in environment
export LOG_LEVEL=DEBUG

# Or in .env file
LOG_LEVEL=DEBUG

# Run test with verbose output
k6 run --verbose test.js
```

## Advanced Usage

### Custom Test Scenarios

```javascript
export const options = {
    scenarios: {
        // Constant load
        constant_load: {
            executor: 'constant-vus',
            vus: 10,
            duration: '5m'
        },
        
        // Spike test
        spike_test: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '1m', target: 100 },
                { duration: '1m', target: 0 }
            ]
        },
        
        // Per-VU iterations
        per_vu_iterations: {
            executor: 'per-vu-iterations',
            vus: 5,
            iterations: 10
        }
    }
};
```

### Custom Thresholds

```javascript
export const options = {
    thresholds: {
        // HTTP metrics
        'http_req_duration': ['p(95)<2000'],
        'http_req_failed': ['rate<0.1'],
        
        // Custom metrics
        'login_duration': ['p(90)<5000'],
        'api_success_rate': ['rate>0.95'],
        
        // Tagged metrics
        'http_req_duration{endpoint:login}': ['p(95)<3000']
    }
};
```

### Integration with CI/CD

```yaml
# Example GitHub Actions workflow
- name: Run Performance Tests
  run: |
    npm run test:smoke
    npm run test:load
  env:
    USER1_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
    USER1_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
    ENVIRONMENT: staging
```

## Next Steps

- **Explore Examples**: Check `src/tests/examples/` for more test patterns
- **API Reference**: See `docs/api/` for detailed API documentation
- **Contributing**: Read `CONTRIBUTING.md` for contribution guidelines
- **Advanced Features**: Check `docs/advanced/` for advanced usage patterns


