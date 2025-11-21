/**
 * Load Test Scenarios Module
 * Predefined load profiles for different test types
 * 
 * Usage:
 *   import { smokeTest, loadTest, stressTest } from './lib/scenarios/load-profiles.js';
 *   export const options = smokeTest();
 */

import { config } from '../config/environments.js';

/**
 * Smoke Test Profile
 * Quick validation with minimal load (1-2 VUs)
 * Use: Verify functionality before running larger tests
 * 
 * @param {Object} customOptions - Override default options
 * @returns {Object} k6 options object
 */
export function smokeTest(customOptions = {}) {
  return {
    scenarios: {
      smoke: {
        executor: 'constant-vus',
        vus: 1,
        duration: '30s',
        tags: { test_type: 'smoke' },
      },
    },
    thresholds: {
      http_req_duration: ['p(95)<2000'],
      http_req_failed: ['rate<0.05'],
    },
    ...customOptions,
  };
}

/**
 * Load Test Profile
 * Simulate normal expected load
 * Use: Assess system performance under typical conditions
 * 
 * @param {Object} customOptions - Override default options
 * @returns {Object} k6 options object
 */
export function loadTest(customOptions = {}) {
  return {
    scenarios: {
      load: {
        executor: 'ramping-vus',
        startVUs: 0,
        stages: [
          { duration: '2m', target: 10 },  // Ramp up
          { duration: '5m', target: 10 },  // Stay at load
          { duration: '2m', target: 0 },   // Ramp down
        ],
        tags: { test_type: 'load' },
      },
    },
    thresholds: config.thresholds || {
      http_req_duration: ['p(95)<1500', 'p(99)<2000'],
      http_req_failed: ['rate<0.05'],
    },
    ...customOptions,
  };
}

/**
 * Stress Test Profile
 * Push system beyond normal load to find breaking point
 * Use: Determine maximum capacity and failure modes
 * 
 * @param {Object} customOptions - Override default options
 * @returns {Object} k6 options object
 */
export function stressTest(customOptions = {}) {
  return {
    scenarios: {
      stress: {
        executor: 'ramping-vus',
        startVUs: 0,
        stages: [
          { duration: '2m', target: 20 },   // Below normal load
          { duration: '5m', target: 20 },   // Normal load
          { duration: '2m', target: 50 },   // Around breaking point
          { duration: '5m', target: 50 },   // Beyond breaking point
          { duration: '2m', target: 100 },  // Peak stress
          { duration: '5m', target: 100 },  // Stay at peak
          { duration: '5m', target: 0 },    // Scale down (recovery)
        ],
        tags: { test_type: 'stress' },
      },
    },
    thresholds: {
      http_req_duration: ['p(95)<3000', 'p(99)<5000'],
      http_req_failed: ['rate<0.10'], // Higher error tolerance
    },
    ...customOptions,
  };
}

/**
 * Get load profile by name
 * @param {string} profile - Profile name (smoke, load, stress)
 * @param {Object} customOptions - Override options
 * @returns {Object} k6 options object
 */
export function getLoadProfile(profile = 'load', customOptions = {}) {
  const profiles = {
    smoke: smokeTest,
    load: loadTest,
    stress: stressTest,
  };

  const profileFn = profiles[profile.toLowerCase()];
  
  if (!profileFn) {
    console.warn(`  Unknown profile: ${profile}, using load test profile`);
    return loadTest(customOptions);
  }

  return profileFn(customOptions);
}

/**
 * Get load profile from environment variable
 * @param {Object} customOptions - Override options
 * @returns {Object} k6 options object
 */
export function getLoadProfileFromEnv(customOptions = {}) {
  const profile = __ENV.TEST_PROFILE || __ENV.LOAD_PROFILE || 'load';
  return getLoadProfile(profile, customOptions);
}

