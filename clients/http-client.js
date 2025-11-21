/**
 * HTTP Client Module
 * Reusable HTTP client with built-in error handling, logging, and metrics
 * 
 * Usage:
 *   import { apiClient } from './lib/api/http-client.js';
 *   const response = apiClient.get('/endpoint');
 *   const response = apiClient.post('/endpoint', data);
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { config } from '../config/environments.js';
import { getHeaders, getFormHeaders, getJsonHeaders } from '../config/credentials.js';

// Custom metrics
export const errorRate = new Rate('api_errors');
export const requestDuration = new Trend('api_request_duration');
export const requestCount = new Counter('api_requests');

/**
 * API Client class with chainable methods
 */
class ApiClient {
  constructor(baseUrl = null) {
    this.baseUrl = baseUrl || config.api.baseUrl;
    this.defaultTimeout = config.api.timeout || 30000;
    this.retryAttempts = config.api.retryAttempts || 3;
  }

  /**
   * Build full URL from path
   * @param {string} path - API endpoint path
   * @returns {string} Full URL
   */
  buildUrl(path) {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    const cleanBase = this.baseUrl.replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    return `${cleanBase}/${cleanPath}`;
  }

  /**
   * Make GET request
   * @param {string} path - API endpoint path
   * @param {Object} options - Request options
   * @returns {Object} Response object
   */
  get(path, options = {}) {
    const url = this.buildUrl(path);
    const params = {
      headers: getHeaders(options.headers || {}),
      timeout: options.timeout || this.defaultTimeout,
      tags: { name: path, method: 'GET', ...options.tags },
    };

    return this.executeRequest(() => http.get(url, params), url, 'GET');
  }

  /**
   * Make POST request
   * @param {string} path - API endpoint path
   * @param {Object|string} payload - Request payload
   * @param {Object} options - Request options
   * @returns {Object} Response object
   */
  post(path, payload, options = {}) {
    const url = this.buildUrl(path);
    const headers = options.contentType === 'form' 
      ? getFormHeaders(options.headers)
      : getJsonHeaders(options.headers);
    
    const body = typeof payload === 'object' && options.contentType === 'form'
      ? this.encodeFormData(payload)
      : typeof payload === 'object'
      ? JSON.stringify(payload)
      : payload;

    const params = {
      headers,
      timeout: options.timeout || this.defaultTimeout,
      tags: { name: path, method: 'POST', ...options.tags },
    };

    return this.executeRequest(() => http.post(url, body, params), url, 'POST');
  }

  /**
   * Make PUT request
   * @param {string} path - API endpoint path
   * @param {Object|string} payload - Request payload
   * @param {Object} options - Request options
   * @returns {Object} Response object
   */
  put(path, payload, options = {}) {
    const url = this.buildUrl(path);
    const headers = getJsonHeaders(options.headers);
    const body = typeof payload === 'object' ? JSON.stringify(payload) : payload;

    const params = {
      headers,
      timeout: options.timeout || this.defaultTimeout,
      tags: { name: path, method: 'PUT', ...options.tags },
    };

    return this.executeRequest(() => http.put(url, body, params), url, 'PUT');
  }

  /**
   * Make DELETE request
   * @param {string} path - API endpoint path
   * @param {Object} options - Request options
   * @returns {Object} Response object
   */
  delete(path, options = {}) {
    const url = this.buildUrl(path);
    const params = {
      headers: getHeaders(options.headers || {}),
      timeout: options.timeout || this.defaultTimeout,
      tags: { name: path, method: 'DELETE', ...options.tags },
    };

    return this.executeRequest(() => http.del(url, null, params), url, 'DELETE');
  }

  /**
   * Execute request with retry logic and metrics
   * @param {Function} requestFn - Function that executes the HTTP request
   * @param {string} url - Request URL
   * @param {string} method - HTTP method
   * @returns {Object} Response object
   */
  executeRequest(requestFn, url, method) {
    let response;
    let attempt = 0;
    let lastError;

    while (attempt < this.retryAttempts) {
      attempt++;
      
      try {
        const startTime = Date.now();
        response = requestFn();
        const duration = Date.now() - startTime;

        // Record metrics
        requestCount.add(1);
        requestDuration.add(duration);
        errorRate.add(response.status >= 400);

        // Log request details
        this.logRequest(method, url, response, attempt);

        // If successful or client error (4xx), don't retry
        if (response.status < 500) {
          return response;
        }

        // Server error (5xx), retry if attempts remaining
        if (attempt < this.retryAttempts) {
          console.warn(`  Server error ${response.status}, retrying (${attempt}/${this.retryAttempts})...`);
          sleep(1 * attempt); // Exponential backoff
          continue;
        }

        return response;
      } catch (error) {
        lastError = error;
        console.error(` Request failed (attempt ${attempt}/${this.retryAttempts}): ${error.message}`);
        
        if (attempt < this.retryAttempts) {
          sleep(1 * attempt);
          continue;
        }
        
        // All retries exhausted
        errorRate.add(1);
        throw error;
      }
    }

    return response;
  }

  /**
   * Encode object to form data
   * @param {Object} data - Data object
   * @returns {string} URL-encoded form data
   */
  encodeFormData(data) {
    return Object.entries(data)
      .map(([key, val]) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`)
      .join('&');
  }

  /**
   * Log request details
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {Object} response - Response object
   * @param {number} attempt - Attempt number
   */
  logRequest(method, url, response, attempt = 1) {
    const statusEmoji = response.status < 300 ? '' : response.status < 400 ? '' : '';
    const retryInfo = attempt > 1 ? ` (retry ${attempt})` : '';
    
    console.log(
      `${statusEmoji} ${method} ${url} - ${response.status} - ${response.timings.duration.toFixed(2)}ms${retryInfo}`
    );
  }

  /**
   * Validate response with custom checks
   * @param {Object} response - Response object
   * @param {Object} checks - Check definitions
   * @returns {boolean} True if all checks passed
   */
  validate(response, checks) {
    const result = check(response, checks);
    
    if (!result) {
      console.error(` Validation failed for ${response.request.url}`);
      console.error(`   Status: ${response.status}`);
      console.error(`   Body: ${response.body.substring(0, 200)}`);
      
      // Stop execution if validation fails
      console.error(` API validation failed - test should be stopped manually`);
      console.error(`   Please fix the API issue before running performance tests`);
      
      // Set a global flag to indicate test should stop
      if (typeof __ENV !== 'undefined') {
        __ENV.TEST_SHOULD_STOP = 'true';
      }
    }
    
    return result;
  }

  /**
   * Common validation checks
   */
  static checks = {
    isOk: { 'status is 200': (r) => r.status === 200 },
    isSuccess: { 'status is 2xx': (r) => r.status >= 200 && r.status < 300 },
    notServerError: { 'status is not 5xx': (r) => r.status < 500 },
    isJson: { 'content-type is JSON': (r) => r.headers['Content-Type']?.includes('application/json') },
    hasBody: { 'response has body': (r) => r.body && r.body.length > 0 },
    isFast: { 'response time < 2000ms': (r) => r.timings.duration < 2000 },
    
    // Combined checks
    okWithJson: {
      'status is 200': (r) => r.status === 200,
      'content-type is JSON': (r) => r.headers['Content-Type']?.includes('application/json'),
      'response has body': (r) => r.body && r.body.length > 0,
    },
  };
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export class for custom instances
export { ApiClient };

