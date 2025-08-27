import http from "k6/http";
import { check, sleep } from "k6";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

export let options = {
  vus: 15,
  iterations: 30,
  summaryTrendStats: ["avg", "p(95)"]
};

// Load env
const envConfig = JSON.parse(open("../../config/caseStages.env.json"));
const BASE_URL = envConfig.BASE_URL; // e.g. https://api-dev3.steeleglobal.net/rest/case/stages
const AUTH_TOKEN = envConfig.AUTH_TOKEN;

export default function () {
  const headers = {
    Authorization: `Bearer ${AUTH_TOKEN}`,
    Accept: "application/json",
  };

  const res = http.get(BASE_URL, { headers });

  // Basic logs
  console.log(`Status: ${res.status}`);
  console.log(`Content-Type: ${res.headers["Content-Type"]}`);
  console.log(`Response time: ${res.timings.duration}ms`);

  // Try parse JSON
  let bodyJson = null;
  try {
    bodyJson = JSON.parse(res.body);
  } catch (_) { /* keep null */ }

  // Validations (success + error scenarios)
  check(res, {
    "status is 2xx": (r) => r.status >= 200 && r.status < 300,
    "status is not 500": (r) => r.status !== 500,
    "response time < 1000ms": (r) => r.timings.duration < 1000,
    "content type is JSON": (r) => r.headers["Content-Type"]?.includes("application/json"),
    "response body is not empty": (r) => r.body && r.body.length > 0,
    "response is valid JSON": (_) => !!bodyJson || (() => { try { JSON.parse(res.body); return true; } catch { return false; } })(),

    // Case stages-specific (flexible)
    "stages shape is array or has stages[]": (_) => {
      if (!bodyJson || res.status < 200 || res.status >= 300) return true;
      if (Array.isArray(bodyJson)) return true;
      if (Array.isArray(bodyJson?.stages)) return true;
      return false;
    },
    "items have id or name": (_) => {
      if (!bodyJson || res.status < 200 || res.status >= 300) return true;
      const arr = Array.isArray(bodyJson) ? bodyJson : bodyJson?.stages;
      if (!Array.isArray(arr) || arr.length === 0) return true; // don't fail on empty lists
      const first = arr[0] ?? {};
      return ("id" in first) || ("name" in first) || ("stageName" in first);
    },

    // Error handling
    "has error/message when failed": (_) => {
      if (res.status >= 200 && res.status < 300) return true;
      try {
        const e = JSON.parse(res.body);
        return e?.error !== undefined || e?.message !== undefined;
      } catch {
        return false;
      }
    },
    "not unauthorized due to invalid token": (_) => {
      if (res.status !== 401) return true;
      try {
        const e = JSON.parse(res.body);
        const msg = `${e?.error ?? ""} ${e?.message ?? ""}`.toLowerCase();
        return !msg.includes("unauthorized");
      } catch {
        return true; // don’t double-fail on non-JSON
      }
    },
  });

  sleep(1);
}

// KPIs + VUs in JSON (and HTML + stdout)
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
    "../../reports/GET_CaseStagesAPI.html": htmlReport(data),
    "../../reports/casestages_summary.json": JSON.stringify({ kpis, vus }, null, 2),
    stdout: baseSummary + customLines,
  };
}