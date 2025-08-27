import http from "k6/http";
import { check, sleep } from "k6";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

// Load configuration strictly from environment variables with sensible defaults
const BASE_URL = __ENV.BASE_URL || "https://api-staging.steeleglobal.net/rest/thirdparty/profile";
const AUTH_TOKEN = __ENV.AUTH_TOKEN || ""; // Provide via env: AUTH_TOKEN
const X_IDENT = __ENV.X_IDENT || "swagger-ui";

// Business payload (override via env to avoid hardcoding)
const status = __ENV.STATUS || "active";
const approvalStatus = __ENV.APPROVAL_STATUS || "pending";
const recordType = __ENV.RECORD_TYPE || "Entity";
const officialName = __ENV.OFFICIAL_NAME || "Test";
const internalOwnerID = __ENV.INTERNAL_OWNER_ID || "692";
const regionID = __ENV.REGION_ID || "1546";
const typeID = __ENV.TYPE_ID || "109";
const categoryID = __ENV.CATEGORY_ID || "274";
const countryCode = __ENV.COUNTRY_CODE || "US";

export const options = {
  vus: 5,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<1000"], // 95% < 1000ms
    http_req_failed: ["rate<0.01"],    // < 1% errors
  },
};

function buildHeaders() {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
    "X-Ident": X_IDENT,
  };
  if (AUTH_TOKEN) headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;
  return headers;
}

function encodeForm(data) {
  const parts = [];
  for (const key in data) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
    const v = data[key];
    if (v === undefined || v === null) continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return parts.join("&");
}

function buildFormBody() {
  return encodeForm({
    status,
    approvalStatus,
    recordType,
    officialName,
    internalOwnerID,
    regionID,
    typeID,
    categoryID,
    countryCode,
  });
}

export default function () {
  const headers = buildHeaders();
  const body = buildFormBody();

  const res = http.post(BASE_URL, body, { headers });

  check(res, {
    "status is 200 or 201": (r) => r.status === 200 || r.status === 201,
    "content-type is json": (r) => String(r.headers["Content-Type"] || "").includes("application/json"),
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    "reports/ThirdPartyProfileCreate_5vus_30s.html": htmlReport(data),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}
