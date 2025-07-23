import http from "k6/http";
import { check, sleep } from "k6";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

export let options = { vus: 4, iterations: 16 };

const BASE_URL = "https://api.tpm.diligentoneplatform-dev.com/rest/clientProfile";
const AUTH_TOKEN = "92efd003d456764938b90645416feee8399ce13f";

export default function () {
  let headers = {
    Authorization: `Bearer ${AUTH_TOKEN}`,
    Accept: "application/json",
  };

  let res = http.get(BASE_URL, { headers });

 console.log(`Status: ${res.status}`);
  console.log(`Body: ${res.body}`);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "response time < 500ms": (r) => r.timings.duration < 500,
  });

  sleep(1);
}
export function handleSummary(data) {
return {
"Tests/reports/ThirdPartyCreationAPI.html": htmlReport(data),
stdout: textSummary(data, { indent: " ", enableColors: true }),
};
}