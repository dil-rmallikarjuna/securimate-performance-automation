import http from 'k6/http';
import { check } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

// Load test configuration: 10 VUs, 100 iterations
export let options = {
    vus: 10,
    iterations: 100,
    thresholds: {
        http_req_duration: ['p(95)<1000'],
        http_req_failed: ['rate<0.01'],
        checks: ['rate>0.99'],
    },
};

export default function () {
    const BASE_URL = __ENV.BASE_URL || 'https://api-dev3.steeleglobal.net/rest/engagements';
    const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';
    const url = `${BASE_URL}?page=1&perPage=1000&pendingReview=0`;

    const headers = {
        'Content-Type': 'application/json',
    };
    if (AUTH_TOKEN) {
        headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
    }

    const response = http.get(url, { headers });

    check(response, {
        'status is 200': (r) => r.status === 200,
        'Content-Type is application/json': (r) =>
            r.headers['Content-Type'] && r.headers['Content-Type'].includes('application/json'),
        'response body is not empty': (r) => r.body && r.body.length > 0,
    });

    let json;
    try {
        json = response.json();
        check(json, {
            'response has "data" field': (j) => j && j.hasOwnProperty('data'),
            'data is an array': (j) => Array.isArray(j.data),
        });
    } catch (e) {
        console.error('Failed to parse JSON:', e.message);
        check(null, { 'valid JSON': () => false });
    }
}

export function handleSummary(data) {
    return {
        "Tests/reports/list_engagement.html": htmlReport(data),
        stdout: textSummary(data, { indent: " ", enableColors: true }),
    };
}
