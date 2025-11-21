/**
 * Credentials Management Module
 * Secure handling of authentication tokens and API keys
 * 
 * Important: Never commit actual credentials. Use environment variables.
 * 
 * Usage:
 *   import { getAuthToken, getHeaders } from './lib/config/credentials.js';
 *   const token = getAuthToken();
 *   const headers = getHeaders();
 */

import { environment } from './environments.js';
import http from 'k6/http';

// Client credentials for different environments
const clientCredentials = {
  development: {
    clientId: __ENV.DEV_CLIENT_ID,
    clientSecret: __ENV.DEV_CLIENT_SECRET,
    tokenUrl: 'https://api-dev3.steeleglobal.net/apiauth/token'
  },
  staging: {
    clientId: __ENV.STAGING_CLIENT_ID,
    clientSecret: __ENV.STAGING_CLIENT_SECRET,
    tokenUrl: 'https://api-staging.steeleglobal.net/apiauth/token'
  }
};

// Cache for tokens
let tokenCache = {
  token: null,
  expiresAt: 0
};

/**
 * Fetch access token from API
 * @returns {string} Access token
 */
function fetchAccessToken() {
  const creds = clientCredentials[environment];
  
  if (!creds) {
    throw new Error(`No credentials configured for environment: ${environment}`);
  }

  if (!creds.clientId || !creds.clientSecret) {
    const varNames = environment === 'staging' ? 'STAGING_CLIENT_ID/STAGING_CLIENT_SECRET' : 'DEV_CLIENT_ID/DEV_CLIENT_SECRET';
    throw new Error(`Missing ${varNames} for ${environment} environment`);
  }

        const payload = `grant_type=client_credentials&client_id=${creds.clientId}&client_secret=${creds.clientSecret}`;

        const response = http.post(creds.tokenUrl, payload, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          timeout: '30s'
        });

  if (response.status !== 200) {
    console.error(`Token fetch failed: ${response.status} - ${response.body}`);
    
    // Check for IP whitelisting error
    if (response.body && response.body.includes('unauthorized IP address')) {
      console.error('❌ IP address not whitelisted for API access');
      console.error('   Please contact your administrator to whitelist this IP address');
      throw new Error('IP address not whitelisted - cannot proceed with tests');
    }
    
    throw new Error(`Failed to fetch token: ${response.status}`);
  }

  try {
    const data = response.json();
    return data.access_token;
  } catch (e) {
    console.error(`Token parsing failed: ${e.message}`);
    throw new Error('Invalid token response format');
  }
}

/**
 * Get authentication token (with caching)
 * @returns {string} Authentication token
 */
export function getAuthToken() {
  // Check if we have a valid cached token
  if (tokenCache.token && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  // Try to fetch new token from API
  try {
    const token = fetchAccessToken();
    
    // Cache token for 50 minutes (tokens typically expire in 1 hour)
    tokenCache = {
      token: token,
      expiresAt: Date.now() + (50 * 60 * 1000)
    };

    console.log(`✅ New access token fetched for ${environment} environment`);
    return token;
        } catch (error) {
          console.warn(`⚠️  API token fetch failed: ${error.message}`);
          
          // If it's an IP whitelisting error, don't fallback - stop execution
          if (error.message.includes('IP address not whitelisted')) {
            throw error;
          }
          
          // Fallback to environment variable if API fails for other reasons
          const fallbackToken = __ENV.AUTH_TOKEN || __ENV.BEARER_TOKEN || __ENV.API_TOKEN || '';
          if (fallbackToken) {
            console.log('🔄 Using fallback token from environment variable');
            return fallbackToken;
          }
          
          // If no fallback, show helpful error message
          console.error('❌ No authentication method available:');
          console.error('   1. Set AUTH_TOKEN environment variable for manual token');
          console.error('   2. Ensure API endpoint is accessible for automatic token fetch');
          console.error('   3. For staging/prod, set CLIENT_ID and CLIENT_SECRET');
          
          throw new Error('Authentication failed: No token available');
        }
}

/**
 * Get X-Ident header value
 * @returns {string} X-Ident value
 */
export function getXIdent() {
  return __ENV.X_IDENT || 'k6-performance-test';
}

/**
 * Get default headers for API requests
 * @param {Object} additionalHeaders - Additional headers to merge
 * @returns {Object} Headers object
 */
export function getHeaders(additionalHeaders = {}) {
  const token = getAuthToken();
  
  const defaultHeaders = {
    'Accept': 'application/json',
    'X-Ident': getXIdent(),
  };
  
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  return {
    ...defaultHeaders,
    ...additionalHeaders,
  };
}

/**
 * Get headers for form-urlencoded requests
 * @returns {Object} Headers object
 */
export function getFormHeaders() {
  return getHeaders({
    'Content-Type': 'application/x-www-form-urlencoded',
  });
}

/**
 * Get headers for JSON requests
 * @returns {Object} Headers object
 */
export function getJsonHeaders() {
  return getHeaders({
    'Content-Type': 'application/json',
  });
}

/**
 * Validate credentials before running tests
 * @returns {boolean} True if credentials are valid
 */
export function validateCredentials() {
  try {
    const token = getAuthToken();
    
    if (!token) {
      console.error(' Missing authentication token. Cannot proceed with tests.');
      console.error('   Set CLIENT_ID and CLIENT_SECRET environment variables for staging/production:');
      console.error(`   k6 run -e CLIENT_ID=your_id -e CLIENT_SECRET=your_secret test.js`);
      return false;
    }
    
    console.log(' Credentials validated successfully');
    return true;
  } catch (error) {
    console.error(` Credential validation failed: ${error.message}`);
    return false;
  }
}

// Mask token for logging (show only first and last 4 chars)
export function maskToken(token) {
  if (!token || token.length < 12) return '****';
  return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
}

/**
 * Initialize token fetching (call this in setup function)
 * @returns {string} Authentication token
 */
export function initializeAuth() {
  try {
    const token = getAuthToken();
    console.log(`🔑 Using auth token: ${maskToken(token)}`);
    console.log(`📋 X-Ident: ${getXIdent()}`);
    return token;
  } catch (error) {
    console.error(`❌ Auth initialization failed: ${error.message}`);
    console.error('   Please set AUTH_TOKEN environment variable:');
    console.error('   export AUTH_TOKEN=your_token_here');
    throw error;
  }
}

