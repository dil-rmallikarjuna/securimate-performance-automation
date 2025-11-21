/**
 * Data Generators Module
 * Generate realistic test data for API requests
 * 
 * Usage:
 *   import { generateThirdParty, generateRandomString } from './lib/data/generators.js';
 *   const thirdParty = generateThirdParty();
 */

import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

/**
 * Pick random item from array
 * @param {Array} array - Array to pick from
 * @returns {any} Random item
 */
export function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generate timestamp-based unique name
 * @param {string} prefix - Name prefix
 * @returns {string} Unique name
 */
export function generateUniqueName(prefix = 'Test') {
  const timestamp = Date.now();
  const random = randomString(6);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Generate Third Party profile data
 * @param {Object} overrides - Override default values
 * @returns {Object} Third party profile data
 */
export function generateThirdParty(overrides = {}) {
  const defaults = {
    status: 'active',
    approvalStatus: 'pending',
    recordType: 'Entity',
    officialName: generateUniqueName('ThirdParty'),
    internalOwnerID: randomChoice([692, 693, 694, 695]),
    regionID: randomChoice([1546, 1547, 1548]),
    typeID: randomChoice([109, 110, 111]),
    categoryID: randomChoice([274, 275, 276]),
    countryCode: randomChoice(['US', 'UK', 'CA', 'AU', 'DE']),
  };

  return {
    ...defaults,
    ...overrides,
  };
}

