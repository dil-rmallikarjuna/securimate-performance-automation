/**
 * Quick Smoke Test
 * Fast validation of critical endpoints
 * 
 * Run:
 *   k6 run -e AUTH_TOKEN=your_token tests/smoke/quick-smoke.test.js
 */

import { sleep } from 'k6';
import { apiClient } from '../../clients/http-client.js';
import { simpleReport } from '../../reporters/reporter.js';
import { smokeTest } from '../../profiles/load-profiles.js';
import { initializeAuth } from '../../config/credentials.js';

export const options = smokeTest();

export function setup() {
  console.log('\n[SMOKE TEST] Starting smoke test - validating critical endpoints\n');
  
  // Initialize authentication (fetches token from API)
  initializeAuth();
  
  return { startTime: Date.now() };
}

export default function() {
  // Test Third Party endpoint
  console.log('Testing: Third Party API');
  const tpResponse = apiClient.get('/rest/thirdparty/profile/ZP3P-01395', {
    tags: { endpoint: 'third_party' },
  });
  
  const tpValid = apiClient.validate(tpResponse, {
    'Third Party - Status OK': (r) => r.status === 200,
  });
  
  // Stop execution if Third Party API fails
  if (!tpValid) {
    console.error('❌ Third Party API validation failed - stopping test execution');
    console.error('   Please fix the API issue before running performance tests');
    return; // Exit the function early
  }
  
  sleep(1);
  
  // Test Client Profile endpoint
  console.log('Testing: Client Profile API');
  const cpResponse = apiClient.get('/rest/clientprofile', {
    tags: { endpoint: 'client_profile' },
  });
  
  apiClient.validate(cpResponse, {
    'Client Profile - Status OK': (r) => r.status === 200,
  });
  
  sleep(1);
}

export function teardown(data) {
  const duration = ((Date.now() - data.startTime) / 1000).toFixed(2);
  console.log(`\n[COMPLETE] Smoke test completed in ${duration}s`);
}

export function handleSummary(data) {
  return simpleReport(data, 'smoke-test');
}

