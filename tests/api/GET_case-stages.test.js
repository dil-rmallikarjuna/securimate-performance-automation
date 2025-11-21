/**
 * GET Case Stages API Performance Test
 * Tests the Case Stages endpoint
 * 
 * Run:
 *   k6 run -e AUTH_TOKEN=your_token tests/api/GET_case-stages.test.js
 */

import { sleep } from 'k6';
import { apiClient } from '../../clients/http-client.js';
import { generateReport } from '../../reporters/reporter.js';
import { loadTest } from '../../profiles/load-profiles.js';
import { validateCredentials } from '../../config/credentials.js';

// Test configuration  
export const options = loadTest({
  vus: 15,
  iterations: 30,
  thresholds: {
    'http_req_duration': ['p(95)<1000'],
    'http_req_failed': ['rate<0.05'],
  },
});

/**
 * Setup function
 */
export function setup() {
  if (!validateCredentials()) {
    throw new Error('Invalid credentials');
  }

  console.log('\n Starting Case Stages API test');
  return { startTime: Date.now() };
}

/**
 * Main test function
 */
export default function() {
  const response = apiClient.get('/rest/case/stages', {
    tags: { endpoint: 'case_stages', method: 'GET' },
  });

  apiClient.validate(response, {
    'GET status is 200': (r) => r.status === 200,
    'GET response is JSON': (r) => r.headers['Content-Type']?.includes('application/json'),
    'GET has stages data': (r) => {
      if (r.status === 200) {
        try {
          const body = r.json();
          return Array.isArray(body) || typeof body === 'object';
        } catch (e) {
          return false;
        }
      }
      return true;
    },
    'GET response time < 1s': (r) => r.timings.duration < 1000,
  });

  if (response.status === 200) {
    console.log(` Case Stages retrieved - ${response.timings.duration.toFixed(2)}ms`);
  }

  sleep(1);
}

/**
 * Generate test report
 */
export function handleSummary(data) {
  return generateReport(data, 'GET_case-stages');
}





