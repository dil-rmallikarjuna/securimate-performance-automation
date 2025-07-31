import http from "k6/http";
import { check } from "k6";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";
import { config } from "../../config/config.js"; // Use config for all dynamic data

export let options = {
  stages: [
    { duration: "30s", target: 10 }, 
    { duration: "1m", target: 20 },
    { duration: "2m", target: 20 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<1000"],
    http_req_failed: ["rate<0.01"],
    checks: ["rate>0.99"],
  },
};

export default function () {
  const url = `${config.BASE_URL}/rest/thirdparty/approvalReasons`;
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${config.AUTH_TOKEN}`,
    "X-Ident": config.X_IDENT,
  };

  const response = http.get(url, { headers });

  check(response, {
    "status is 200": (r) => r.status === 200,
    "Content-Type is application/json": (r) =>
      r.headers["Content-Type"] && r.headers["Content-Type"].includes("application/json"),
    "response body is not empty": (r) => r.body && r.body.length > 0,
  });

  console.log(`Status: ${response.status}`);
  console.log(`Body: ${response.body}`);
}

export function handleSummary(data) {
  return {
    "Tests/reports/approval_reasons_report.html": htmlReport(data),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}