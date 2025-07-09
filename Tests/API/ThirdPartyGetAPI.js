import http from "k6/http";
import { check } from "k6";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

// All config and test data loaded from environment variables
const BASE_URL = __ENV.BASE_URL || "";
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "";
const X_IDENT = __ENV.X_IDENT || "";
const TP_REFERENCE = __ENV.TP_REFERENCE || "";

export default function () {
  const url = `${BASE_URL}/${TP_REFERENCE}`;

  const headers = {
    Accept: "application/json",
    Authorization: AUTH_TOKEN,
    "X-Ident": X_IDENT,
  };

  const response = http.get(url, { headers });

  check(response, {
    "is status 200": (r) => r.status === 200,
    "response contains data": (r) => r.json("id") !== undefined,
  });

  console.log(`Response: ${response.body}`);
}
export function handleSummary(data) {
  return {
    "Tests/reports/ThirdPartyGetAPI.html": htmlReport(data),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}
