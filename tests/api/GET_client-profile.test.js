/**
 * Client Profile API Performance Test
 * Tests GET and PUT operations on Client Profile endpoint
 * 
 * Run:
 *   k6 run -e AUTH_TOKEN=your_token tests/api/client-profile.test.js
 */

import { sleep } from 'k6';
import { apiClient } from '../../clients/http-client.js';
import { generateReport } from '../../reporters/reporter.js';
import { loadTest } from '../../profiles/load-profiles.js';
import { validateCredentials } from '../../config/credentials.js';

export const options = loadTest();

export function setup() {
  if (!validateCredentials()) {
    throw new Error('Invalid credentials');
  }

  console.log('\n Fetching current client profile...');
  
  const response = apiClient.get('/rest/clientprofile', {
    tags: { endpoint: 'get_profile', phase: 'setup' },
  });

  if (response.status === 200) {
    const profile = response.json();
    console.log(` Profile: ${profile.officialName}`);
    return { originalProfile: profile };
  }

  return { originalProfile: null };
}

export default function(data) {
  // Test GET
  const currentProfile = testGetClientProfile();
  sleep(1);
  
  // Test PUT
  if (currentProfile) {
    testUpdateClientProfile(currentProfile);
  }
  sleep(2);
}

function testGetClientProfile() {
  const response = apiClient.get('/rest/clientprofile', {
    tags: { endpoint: 'get_profile' },
  });

  apiClient.validate(response, {
    'GET status is 200': (r) => r.status === 200,
    'GET has required fields': (r) => {
      if (r.status === 200) {
        const body = r.json();
        return body.officialName && body.countryCode;
      }
      return true;
    },
  });

  return response.status === 200 ? response.json() : null;
}

function testUpdateClientProfile(profile) {
  const updatedProfile = {
    ...profile,
    lastUpdated: new Date().toISOString(),
  };

  const response = apiClient.put('/rest/clientprofile', updatedProfile, {
    tags: { endpoint: 'put_profile' },
  });

  apiClient.validate(response, {
    'PUT status is 2xx': (r) => r.status >= 200 && r.status < 300,
  });
}

export function handleSummary(data) {
  return generateReport(data, 'client-profile-api');
}

