import http from "k6/http";
import { check, sleep } from "k6";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

export let options = { vus: 15, iterations: 30, summaryTrendStats: ['avg', 'p(95)'] };

const envConfig = JSON.parse(open('../../config/clientProfile.env.json'));
const BASE_URL = envConfig.BASE_URL;
const AUTH_TOKEN = envConfig.AUTH_TOKEN;

export default function () {
  let headers = {
    Authorization: `Bearer ${AUTH_TOKEN}`,
    Accept: "application/json",
  };

  let res = http.get(BASE_URL, { headers });

  console.log(`Status: ${res.status}`);
  console.log(`Body: ${res.body}`);
  console.log(`Content-Type: ${res.headers['Content-Type']}`);
  console.log(`Response time: ${res.timings.duration}ms`);

  // Parse response body for content validation
  let responseBody;
  try {
    responseBody = JSON.parse(res.body);
  } catch (e) {
    console.error('Failed to parse response as JSON:', e);
    responseBody = {};
  }

  check(res, {
    // Status code validations
    "status is 200": (r) => r.status === 200,
    "status is not 500": (r) => r.status !== 500,
    
    // Response time validation
    "response time > 500ms": (r) => r.timings.duration > 500,
    
    // Content type validation
    "content type is JSON": (r) => r.headers['Content-Type'] && r.headers['Content-Type'].includes('application/json'),
    
    // Response body validations
    "response body is not empty": (r) => r.body && r.body.length > 0,
    "response is valid JSON": (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch (e) {
        return false;
      }
    },
    
    // Success scenario validations (when status is 200)
    "has client profile data when successful": (r) => {
      if (r.status === 200) {
        const body = JSON.parse(r.body);
        return body.officialName !== undefined || body.shortName !== undefined || body.address1 !== undefined;
      }
      return true; 
    },
    
    // content validations
    "officialName is not empty when present": (r) => {
      if (r.status === 200) {
        const body = JSON.parse(r.body);
        return !body.officialName || (body.officialName && body.officialName.length > 0);
      }
      return true;
    },
    
    "required fields are present": (r) => {
      if (r.status === 200) {
        const body = JSON.parse(r.body);
        // Check for mandatory fields
        return body.hasOwnProperty('officialName') && 
               body.hasOwnProperty('shortName') && 
               body.hasOwnProperty('countryCode');
      }
      return true;
    },
    
    // Error scenario validations
    "has error message when failed": (r) => {
      if (r.status !== 200) {
        const body = JSON.parse(r.body);
        return body.error !== undefined || body.message !== undefined;
      }
      return true; 
    },
    
    // Authentication validation
    "not unauthorized due to invalid token": (r) => {
      if (r.status === 401) {
        const body = JSON.parse(r.body);
        return !body.error || !body.error.toLowerCase().includes('unauthorized');
      }
      return true;
    },
  });

  sleep(1);
}
export function handleSummary(data) {
  const toNum = (v) => (v == null ? null : Number(v));
  const durationSec = (data.state?.testRunDurationMs ?? 0) / 1000;

  const httpReqs = toNum(data.metrics.http_reqs?.values?.count) || 0;
  const avgRespMs = toNum(data.metrics.http_req_duration?.values?.avg);
  const p95Ms = toNum(data.metrics.http_req_duration?.values?.['p(95)']);
  const failRate = toNum(data.metrics.http_req_failed?.values?.rate) || 0; // 0..1

  const kpis = {
    'Avg Throughput (req/sec)': durationSec ? +(httpReqs / durationSec).toFixed(2) : 0,
    'Avg Response Time (ms)': avgRespMs != null ? +avgRespMs.toFixed(2) : null,
    'P95 Latency (ms)': p95Ms != null ? +p95Ms.toFixed(2) : null,
    'Error Rate (%)': +(failRate * 100).toFixed(2)
  };

  const baseSummary = textSummary(data, { indent: " ", enableColors: true });
  const customLines =
    `\nCustom KPIs:\n` +
    `  Avg Throughput (req/sec): ${kpis['Avg Throughput (req/sec)']}\n` +
    `  Avg Response Time (ms):   ${kpis['Avg Response Time (ms)']}\n` +
    `  P95 Latency (ms):         ${kpis['P95 Latency (ms)']}\n` +
    `  Error Rate (%):           ${kpis['Error Rate (%)']}\n`;

  // Optional: keep your existing overview/HTML if you want
  return {
    "../../reports/Get_ClientProfile.html": htmlReport(data),
    "../../reports/summary.json": JSON.stringify(data, null, 2),
    "../../reports/run_overview.json": JSON.stringify({
      vus_max: data.metrics.vus_max?.values?.value ?? options?.vus ?? 0,
      http_reqs: httpReqs,
      duration_sec: +durationSec.toFixed(2),
      http_req_duration_p95_ms: p95Ms
    }, null, 2),
    "../../reports/get_summary.json": JSON.stringify({ kpis }, null, 2), // NEW: KPIs for GET
    stdout: baseSummary + customLines,
  };
}