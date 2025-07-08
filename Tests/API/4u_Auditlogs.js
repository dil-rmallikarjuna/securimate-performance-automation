import http from 'k6/http';
import { check } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

export let options = {
  vus: 4,
  iterations: 16,
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000', 'avg<400'],
    http_req_failed: ['rate<0.01'], // less than 1% failed requests
    'checks': ['rate>0.99'],       // at least 99% of checks must pass
  },
};

export default function () {
  const url = 'https://api-dev3.steeleglobal.net/rest/auditLogEvents';
  const response = http.get(url);

  check(response, {
    'status is 200': (r) => r.status === 200,
  });
}

export function handleSummary(data) {
  return {
    "Tests/reports/4u_Auditlogs.html": htmlReport(data),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}