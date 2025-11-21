/**
 * Environment Configuration Module
 * Centralized configuration management for all k6 tests
 * 
 * Usage:
 *   import { config } from './lib/config/environment.js';
 *   const baseUrl = config.api.baseUrl;
 */

const environments = {
  development: {
    api: {
      baseUrl: 'https://api-dev3.steeleglobal.net',
      timeout: 30000,
      retryAttempts: 3,
    },
    thresholds: {
      http_req_duration: ['p(95)<2000', 'p(99)<3000'],
      http_req_failed: ['rate<0.10'], // 10% error rate for dev
    },
  },
  
  staging: {
    api: {
      baseUrl: 'https://api-staging.steeleglobal.net',
      timeout: 30000,
      retryAttempts: 3,
    },
    thresholds: {
      http_req_duration: ['p(95)<1500', 'p(99)<2000'],
      http_req_failed: ['rate<0.05'], // 5% error rate for staging
    },
  },
  
  production: {
    api: {
      baseUrl: 'https://api.steeleglobal.net',
      timeout: 30000,
      retryAttempts: 2,
    },
    thresholds: {
      http_req_duration: ['p(95)<1000', 'p(99)<1500'],
      http_req_failed: ['rate<0.01'], // 1% error rate for production
    },
  },
};

// Get current environment from environment variable or default to development
const currentEnv = __ENV.ENVIRONMENT || __ENV.ENV || 'development';

if (!environments[currentEnv]) {
  throw new Error(`Invalid environment: ${currentEnv}. Valid options: ${Object.keys(environments).join(', ')}`);
}

// Export the configuration
export const config = environments[currentEnv];
export const environment = currentEnv;

// Log current environment
console.log(` Running tests in ${currentEnv.toUpperCase()} environment`);
console.log(` API Base URL: ${config.api.baseUrl}`);

