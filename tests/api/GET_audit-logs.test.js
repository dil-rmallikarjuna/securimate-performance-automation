/**
 * GET Audit Logs API Performance Test
 * Tests the Audit Log Events endpoint
 * 
 * Run:
 *   k6 run -e AUTH_TOKEN=your_token tests/api/GET_audit-logs.test.js
 *   k6 run -e AUTH_TOKEN=your_token -e TEST_PROFILE=load tests/api/GET_audit-logs.test.js
 */

import { sleep } from 'k6';
import { apiClient } from '../../clients/http-client.js';
import { generateReport } from '../../reporters/reporter.js';
import { loadTest } from '../../profiles/load-profiles.js';
import { validateCredentials } from '../../config/credentials.js';

// Test configuration
export const options = loadTest({
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000', 'avg<400'],
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

  console.log('\n Starting Audit Logs API test');
  return { startTime: Date.now() };
}

/**
 * Main test function
 */
export default function() {
  const response = apiClient.get('/rest/auditLogEvents', {
    tags: { endpoint: 'audit_logs', method: 'GET' },
  });

  apiClient.validate(response, {
    'GET status is 200': (r) => r.status === 200,
    'GET response time < 500ms': (r) => r.timings.duration < 500,
    'GET has audit log data': (r) => {
      if (r.status === 200) {
        const body = r.json();
        return Array.isArray(body) || typeof body === 'object';
      }
      return true;
    },
  });

  sleep(1);
}

/**
 * Generate test report
 */
export function handleSummary(data) {
  return generateReport(data, 'GET_audit-logs');
}


