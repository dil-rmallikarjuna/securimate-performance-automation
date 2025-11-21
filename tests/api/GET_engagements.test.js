/**
 * GET Engagements List API Performance Test
 * Tests the Engagements endpoint with pagination
 * 
 * Run:
 *   k6 run -e AUTH_TOKEN=your_token tests/api/GET_engagements.test.js
 */

import { sleep } from 'k6';
import { apiClient } from '../../clients/http-client.js';
import { generateReport } from '../../reporters/reporter.js';
import { loadTest } from '../../profiles/load-profiles.js';
import { validateCredentials } from '../../config/credentials.js';

// Test configuration
export const options = loadTest({
  vus: 10,
  iterations: 100,
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

  console.log('\n Starting Engagements List API test');
  return { startTime: Date.now() };
}

/**
 * Main test function
 */
export default function() {
  // Test with pagination parameters
  const page = Math.floor(Math.random() * 10) + 1; // Random page 1-10
  const perPage = 1000;
  const pendingReview = 0;

  const url = `/rest/engagements?page=${page}&perPage=${perPage}&pendingReview=${pendingReview}`;

  const response = apiClient.get(url, {
    tags: { endpoint: 'engagements', method: 'GET' },
  });

  apiClient.validate(response, {
    'GET status is 200': (r) => r.status === 200,
    'GET response is JSON': (r) => r.headers['Content-Type']?.includes('application/json'),
    'GET has engagements data': (r) => {
      if (r.status === 200) {
        try {
          const body = r.json();
          return Array.isArray(body) || (typeof body === 'object' && body.data);
        } catch (e) {
          return false;
        }
      }
      return true;
    },
    'GET response time < 1s': (r) => r.timings.duration < 1000,
  });

  if (response.status === 200) {
    const data = response.json();
    const count = Array.isArray(data) ? data.length : (data.data?.length || 0);
    console.log(` Retrieved ${count} engagements (page ${page}) - ${response.timings.duration.toFixed(2)}ms`);
  }

  sleep(1);
}

/**
 * Generate test report
 */
export function handleSummary(data) {
  return generateReport(data, 'GET_engagements');
}





