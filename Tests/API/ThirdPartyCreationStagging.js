import http from "k6/http";
import { check, sleep } from "k6";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

// VU configuration
export let options = {
  vus: 10,
  iterations: 20,
  summaryTrendStats: ["avg", "p(95)", "max"]
};

// Load baseUrl, authToken, and payload from one JSON file
const cfg = JSON.parse(open("../../config/thirdparty.env.json"));
const BASE_URL = cfg.baseUrl || cfg.apiUrl;
const AUTH_TOKEN = cfg.authToken;

export default function () {
  const url = BASE_URL;

  const payload = cfg.payload || {
    status: cfg.status || "active",
    approvalStatus: cfg.approvalStatus || "pending",
    recordType: cfg.recordType || "Entity",
    officialName: cfg.officialName || "Test",
    internalOwnerID: cfg.internalOwnerID ?? 692,
    regionID: cfg.regionID ?? 1546,
    typeID: cfg.typeID ?? 109,
    categoryID: cfg.categoryID ?? 274,
    countryCode: cfg.countryCode || "US",
  };

  const formBody = Object.entries(payload)
    .map(([key, val]) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`)
    .join("&");

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "Accept": "application/json",
    "Authorization": `Bearer ${AUTH_TOKEN}`,
    ...(cfg.xIdent ? { "X-Ident": String(cfg.xIdent) } : {}),
  };

  const res = http.post(url, formBody, { headers });

  console.log(`POST Status: ${res.status}`);
  console.log(`Response time: ${res.timings.duration}ms`);

  check(res, {
    "status is 2xx": (r) => r.status >= 200 && r.status < 300,
    "status is not 500": (r) => r.status !== 500,
    "response time < 1000ms": (r) => r.timings.duration < 1000,
    "content type is JSON": (r) => r.headers["Content-Type"]?.includes("application/json"),
    "response body is not empty": (r) => r.body && r.body.length > 0,
  });

  sleep(1);
}

// KPI reporting
export function handleSummary(data) {
  const toNum = (v) => (v == null ? null : Number(v));
  const durationSec = (data.state?.testRunDurationMs ?? 0) / 1000;

  const httpReqs = toNum(data.metrics.http_reqs?.values?.count) || 0;
  const avgRespMs = toNum(data.metrics.http_req_duration?.values?.avg);
  const p95Ms = toNum(data.metrics.http_req_duration?.values?.["p(95)"]);
  const failRate = toNum(data.metrics.http_req_failed?.values?.rate) || 0;

  const kpis = {
    "Avg Throughput (req/sec)": durationSec ? +(httpReqs / durationSec).toFixed(2) : 0,
    "Avg Response Time (ms)": avgRespMs != null ? +avgRespMs.toFixed(2) : null,
    "P95 Latency (ms)": p95Ms != null ? +p95Ms.toFixed(2) : null,
    "Error Rate (%)": +((failRate * 100)).toFixed(2),
  };

  const vus = {
    configured: options?.vus ?? 0,
    max_observed: data.metrics.vus_max?.values?.value ?? (options?.vus ?? 0),
  };

  const baseSummary = textSummary(data, { indent: " ", enableColors: true });
  const customLines =
    `\nKPIs:\n` +
    `  Avg Throughput (req/sec): ${kpis["Avg Throughput (req/sec)"]}\n` +
    `  Avg Response Time (ms):   ${kpis["Avg Response Time (ms)"]}\n` +
    `  P95 Latency (ms):         ${kpis["P95 Latency (ms)"]}\n` +
    `  Error Rate (%):           ${kpis["Error Rate (%)"]}\n` +
    `  VUs (configured/max):     ${vus.configured}/${vus.max_observed}\n`;

  return {
    "../../reports/POST_ThirdPartyProfileAPI.html": htmlReport(data),
    "../../reports/thirdparty_summary.json": JSON.stringify({ kpis, vus }, null, 2),
    stdout: baseSummary + customLines,
  };
}
