/**
 * Custom Reporter Module
 * Generate comprehensive test reports in multiple formats
 * 
 * Usage:
 *   import { generateReport } from './lib/utils/reporter.js';
 *   export function handleSummary(data) {
 *     return generateReport(data, 'my-test');
 *   }
 */

import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { environment } from '../config/environments.js';

/**
 * Extract key metrics from k6 data
 * @param {Object} data - k6 test data
 * @returns {Object} Extracted metrics
 */
export function extractMetrics(data) {
  const toNum = (v) => (v == null ? null : Number(v));
  const durationSec = (data.state?.testRunDurationMs ?? 0) / 1000;

  const metrics = {
    // Request metrics
    totalRequests: toNum(data.metrics.http_reqs?.values?.count) || 0,
    failedRequests: toNum(data.metrics.http_req_failed?.values?.count) || 0,
    
    // Response time metrics
    avgResponseTime: toNum(data.metrics.http_req_duration?.values?.avg),
    minResponseTime: toNum(data.metrics.http_req_duration?.values?.min),
    maxResponseTime: toNum(data.metrics.http_req_duration?.values?.max),
    p50ResponseTime: toNum(data.metrics.http_req_duration?.values?.['p(50)']),
    p90ResponseTime: toNum(data.metrics.http_req_duration?.values?.['p(90)']),
    p95ResponseTime: toNum(data.metrics.http_req_duration?.values?.['p(95)']),
    p99ResponseTime: toNum(data.metrics.http_req_duration?.values?.['p(99)']),
    
    // Rate metrics
    errorRate: toNum(data.metrics.http_req_failed?.values?.rate) || 0,
    requestRate: durationSec > 0 ? (toNum(data.metrics.http_reqs?.values?.count) || 0) / durationSec : 0,
    
    // VU metrics
    maxVUs: toNum(data.metrics.vus_max?.values?.value) || 0,
    
    // Timing
    testDuration: durationSec,
  };

  // Calculate derived metrics
  metrics.successRate = 1 - metrics.errorRate;
  metrics.throughput = metrics.requestRate;

  return metrics;
}

/**
 * Generate KPI summary
 * @param {Object} metrics - Extracted metrics
 * @returns {Object} KPI summary
 */
export function generateKPIs(metrics) {
  return {
    'Total Requests': metrics.totalRequests,
    'Failed Requests': metrics.failedRequests,
    'Success Rate (%)': +(metrics.successRate * 100).toFixed(2),
    'Error Rate (%)': +(metrics.errorRate * 100).toFixed(2),
    'Throughput (req/s)': +metrics.requestRate.toFixed(2),
    'Avg Response Time (ms)': metrics.avgResponseTime != null ? +metrics.avgResponseTime.toFixed(2) : null,
    'P50 Latency (ms)': metrics.p50ResponseTime != null ? +metrics.p50ResponseTime.toFixed(2) : null,
    'P95 Latency (ms)': metrics.p95ResponseTime != null ? +metrics.p95ResponseTime.toFixed(2) : null,
    'P99 Latency (ms)': metrics.p99ResponseTime != null ? +metrics.p99ResponseTime.toFixed(2) : null,
    'Max Response Time (ms)': metrics.maxResponseTime != null ? +metrics.maxResponseTime.toFixed(2) : null,
    'Test Duration (s)': +metrics.testDuration.toFixed(2),
    'Max VUs': metrics.maxVUs,
  };
}

/**
 * Generate custom summary text
 * @param {Object} kpis - KPI summary
 * @param {string} testName - Test name
 * @returns {string} Formatted summary text
 */
export function generateCustomSummary(kpis, testName) {
  const emoji = kpis['Error Rate (%)'] < 5 ? '' : kpis['Error Rate (%)'] < 10 ? '' : '';
  
  return `

${emoji} ${testName.toUpperCase()} - PERFORMANCE TEST RESULTS


Environment:        ${environment.toUpperCase()}
Test Duration:      ${kpis['Test Duration (s)']}s
Max Virtual Users:  ${kpis['Max VUs']}

 REQUEST METRICS:
   Total Requests:     ${kpis['Total Requests']}
   Failed Requests:    ${kpis['Failed Requests']}
   Success Rate:       ${kpis['Success Rate (%)']}%
   Error Rate:         ${kpis['Error Rate (%)']}%
   Throughput:         ${kpis['Throughput (req/s)']} req/s

�  RESPONSE TIME METRICS:
   Average:            ${kpis['Avg Response Time (ms)']}ms
   P50 (Median):       ${kpis['P50 Latency (ms)']}ms
   P95:                ${kpis['P95 Latency (ms)']}ms
   P99:                ${kpis['P99 Latency (ms)']}ms
   Max:                ${kpis['Max Response Time (ms)']}ms


`;
}

/**
 * Generate comprehensive report in multiple formats
 * @param {Object} data - k6 test data
 * @param {string} testName - Test name (for file naming)
 * @param {Object} options - Report options
 * @returns {Object} Report files map
 */
export function generateReport(data, testName, options = {}) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sanitizedName = testName.replace(/[^a-zA-Z0-9-_]/g, '_');
  
  // Extract metrics and generate KPIs
  const metrics = extractMetrics(data);
  const kpis = generateKPIs(metrics);
  
  // Generate custom summary
  const customSummary = generateCustomSummary(kpis, testName);
  
  // Base summary
  const baseSummary = textSummary(data, { indent: ' ', enableColors: true });
  
  // Build report object
  const reports = {
    // HTML Report
    [`reports/html/${sanitizedName}_${timestamp}.html`]: htmlReport(data),
    
    // JSON Reports
    [`reports/json/${sanitizedName}_summary_${timestamp}.json`]: JSON.stringify({
      testName,
      environment,
      timestamp: new Date().toISOString(),
      kpis,
      metrics,
    }, null, 2),
    
    [`reports/json/${sanitizedName}_full_${timestamp}.json`]: JSON.stringify(data, null, 2),
    
    // Console output
    stdout: baseSummary + customSummary,
  };
  
  // Add CSV report if requested
  if (options.csv) {
    reports[`reports/csv/${sanitizedName}_${timestamp}.csv`] = generateCSVReport(kpis);
  }
  
  console.log('\n Reports generated:');
  Object.keys(reports).forEach(path => {
    if (path !== 'stdout') {
      console.log(`   - ${path}`);
    }
  });
  
  return reports;
}

/**
 * Generate CSV report
 * @param {Object} kpis - KPI data
 * @returns {string} CSV content
 */
function generateCSVReport(kpis) {
  const headers = Object.keys(kpis).join(',');
  const values = Object.values(kpis).join(',');
  return `${headers}\n${values}`;
}

/**
 * Simple report for quick tests (minimal output)
 * @param {Object} data - k6 test data
 * @param {string} testName - Test name
 * @returns {Object} Report files map
 */
export function simpleReport(data, testName) {
  const metrics = extractMetrics(data);
  const kpis = generateKPIs(metrics);
  
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }) + 
            generateCustomSummary(kpis, testName),
  };
}


