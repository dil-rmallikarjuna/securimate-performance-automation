import http from "k6/http";
import { check, sleep } from "k6";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

export let options = {
  vus: 4,
  iterations: 16,
};

export default function () {
  let res = http.get("https://api-dev3.steeleglobal.net/rest/case/stages");

  check(res, {
    "status is 200": (r) => r.status === 200,
    "response time < 500ms": (r) => r.timings.duration < 500,
  });

  sleep(1);
}

export function handleSummary(data) {
    return {
        "Tests/reports/list_engagement.html": htmlReport(data),
        stdout: textSummary(data, { indent: " ", enableColors: true }),
    };
}