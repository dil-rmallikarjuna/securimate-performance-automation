/**
 * Third Party API Performance Test
 * Tests Third Party Profile creation and retrieval endpoints
 * 
 * Run:
 *   k6 run -e AUTH_TOKEN=your_token tests/api/third-party.test.js
 *   k6 run -e AUTH_TOKEN=your_token -e ENVIRONMENT=staging tests/api/third-party.test.js
 *   k6 run -e AUTH_TOKEN=your_token -e TEST_PROFILE=load tests/api/third-party.test.js
 */

import { sleep } from 'k6';
import { apiClient, ApiClient } from '../../clients/http-client.js';
import { generateReport } from '../../reporters/reporter.js';
import { generateThirdParty } from '../../generators/generators.js';
import { getLoadProfileFromEnv } from '../../profiles/load-profiles.js';
import { validateCredentials } from '../../config/credentials.js';

// Test configuration - load profile from environment
export const options = getLoadProfileFromEnv({
  thresholds: {
    'http_req_duration{endpoint:get}': ['p(95)<1000'],
    'http_req_duration{endpoint:post}': ['p(95)<2000'],
    'http_req_failed': ['rate<0.05'],
  },
});

/**
 * Setup - Runs once before test
 */
export function setup() {
  if (!validateCredentials()) {
    throw new Error('Invalid credentials');
  }

  const referenceId = __ENV.TP_REFERENCE_ID;
  console.log(`\n Fetching reference Third Party: ${referenceId}`);
  
  const response = apiClient.get(`/rest/thirdparty/profile/${referenceId}`, {
    tags: { endpoint: 'get', phase: 'setup' },
  });

  apiClient.validate(response, ApiClient.checks.okWithJson);

  if (response.status === 200) {
    const data = response.json();
    console.log(` Reference profile: ${data.officialName}`);
    return { referenceProfile: data };
  }

  return { referenceProfile: null };
}

/**
 * Main test function
 */
export default function(data) {
  // Test 1: GET Third Party
  testGetThirdParty();
  sleep(1);
  
  // Test 2: POST (Create) Third Party
  testCreateThirdParty(data.referenceProfile);
  sleep(2);
}

function testGetThirdParty() {
  const tpId = __ENV.TP_REFERENCE_ID || 'ZP3P-01395';
  
  const response = apiClient.get(`/rest/thirdparty/profile/${tpId}`, {
    tags: { endpoint: 'get' },
  });

  apiClient.validate(response, {
    'GET status is 200': (r) => r.status === 200,
    'GET has profile data': (r) => r.status === 200 && r.json().officialName !== undefined,
  });
}

function testCreateThirdParty(referenceProfile) {
  const testData = referenceProfile 
    ? { ...referenceProfile, officialName: `${referenceProfile.officialName}_Copy_${Date.now()}` }
    : generateThirdParty();

  const response = apiClient.post('/rest/thirdparty/profile', testData, {
    contentType: 'form',
    tags: { endpoint: 'post' },
  });

  apiClient.validate(response, {
    'POST status is 2xx': (r) => r.status >= 200 && r.status < 300,
  });

  if (response.status >= 200 && response.status < 300) {
    const profile = response.json();
    console.log(` Created: ${profile.officialName || 'Third Party'}`);
  }
}

export function handleSummary(data) {
  return generateReport(data, 'third-party-api');
}

