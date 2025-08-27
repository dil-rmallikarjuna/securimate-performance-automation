import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

// Import the default exported functions from each test
import getClient from "./API/GET_ClientProfile.js";
import putClient from "./API/PUT_ClientProfile.js";

export const options = {
  scenarios: {
    get_client: {
      executor: "per-vu-iterations",
      vus: 4,
      iterations: 16,
      exec: "getScenario",
    },
    put_client: {
      executor: "per-vu-iterations",
      vus: 1,
      iterations: 1,
      exec: "putScenario",
      startTime: "1s" // optional stagger
    },
  },
};

export function getScenario() {
  getClient(); // calls your GET test
}

export function putScenario() {
  putClient(); // calls your PUT test
}

// Single combined report for the whole run
export function handleSummary(data) {
  return {
    "reports/Combined.html": htmlReport(data),
    "reports/summary.json": JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}