/**
 * GET Third Party Approval Reasons API Performance Test
 * Tests the Third Party approval reasons endpoint
 * 
 * Run:
 *   k6 run -e AUTH_TOKEN=your_token tests/api/GET_third-party-approval.test.js
 */

import { sleep } from 'k6';
import { apiClient } from '../../clients/http-client.js';
import { generateReport } from '../../reporters/reporter.js';
import { stressTest } from '../../profiles/load-profiles.js';
import { validateCredentials } from '../../config/credentials.js';

// Test configuration - stress test with ramping stages
export const options = stressTest({
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 20 },
    { duration: '2m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000'],
    'http_req_failed': ['rate<0.01'],
    'checks': ['rate>0.99'],
  },
});

/**
 * Setup function
 */
export function setup() {
  if (!validateCredentials()) {
    throw new Error('Invalid credentials');
  }

  console.log('\n Starting Third Party Approval Reasons API test');
  return { startTime: Date.now() };
}

/**
 * Main test function
 */
export default function() {
  const response = apiClient.get('/rest/thirdparty/approvalReasons', {
    tags: { endpoint: 'third_party_approval', method: 'GET' },
  });

  apiClient.validate(response, {
    'GET status is 200': (r) => r.status === 200,
    'GET response is JSON': (r) => r.headers['Content-Type']?.includes('application/json'),
    'GET has approval reasons': (r) => {
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
    const reasons = response.json();
    const count = Array.isArray(reasons) ? reasons.length : Object.keys(reasons).length;
    console.log(` Retrieved ${count} approval reasons - ${response.timings.duration.toFixed(2)}ms`);
  }

  sleep(Math.random() * 2 + 1); // Random sleep 1-3 seconds
}

/**
 * Generate test report
 */
export function handleSummary(data) {
  return generateReport(data, 'GET_third-party-approval');
}





