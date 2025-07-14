import http from "k6/http";
import { check } from "k6";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

export let options = {
  stages: [
    { duration: "30s", target: 50 }, // ramp up to 50 VUs over 30s
    { duration: "1m", target: 100 }, // ramp up to 100 VUs over 1m
    { duration: "2m", target: 100 }, // stay at 100 VUs for 2m
    { duration: "30s", target: 0 }, // ramp down to 0 VUs over 30s
  ],
  thresholds: {
    http_req_duration: ["p(95)<1000"],
    http_req_failed: ["rate<0.01"],
    checks: ["rate>0.99"],
  },
};

export default function () {
  const url = "https://api-dev3.steeleglobal.net/rest/ddq/intakeFormInstances";
  const headers = {
    Accept: "application/json",
    Authorization: "Bearer b857ecdab4c384af34fcc0fbfccea6fb0c08ad6f",
    "X-Ident": "swagger-ui",
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
        "Tests/reports/list_engagement.html": htmlReport(data),
        stdout: textSummary(data, { indent: " ", enableColors: true }),
    };
}