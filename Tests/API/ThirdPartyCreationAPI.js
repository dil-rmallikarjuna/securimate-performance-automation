import http from 'k6/http';
import { check, sleep } from 'k6';

// All config and test data loaded from environment variables
const BASE_URL = __ENV.BASE_URL || '';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';
const X_IDENT = __ENV.X_IDENT || '';
const TP_REFERENCE = __ENV.TP_REFERENCE || '';

// Load test scenarios
export const options = {
  scenarios: {
    load_test: {
      executor: 'ramping-vus',
      startVUs: Number(__ENV.START_VUS) || 1,
      stages: [
        { duration: '10s', target: Number(__ENV.STAGE1_TARGET) || 1 },
        { duration: '10s', target: Number(__ENV.STAGE2_TARGET) || 1 },
        { duration: '10s', target: Number(__ENV.STAGE3_TARGET) || 1 },
      ],
    },
  },
};

let fetchedData = null;

export function setup() {
  const getUrl = `${BASE_URL}/${TP_REFERENCE}`;
  const headers = {
    'Accept': 'application/json',
    'Authorization': AUTH_TOKEN,
    'X-Ident': X_IDENT,
  };

  console.log(`Making GET request to: ${getUrl}`);
  console.log(`Using headers: ${JSON.stringify(headers)}`);

  const response = http.get(getUrl, { headers });

  console.log(`Response status: ${response.status}`);
  console.log(`Response body: ${response.body}`);

  check(response, {
    'GET status is 200': (r) => r.status === 200,
  });

  if (response.status === 200) {
    fetchedData = response.json();
    console.log(`Fetched Profile Data: ${JSON.stringify(fetchedData)}`);
  } else {
    console.error(`Failed to fetch data: ${response.status} - ${response.body}`);
  }

  return fetchedData;
}

export default function (data) {
  if (!data) {
    console.error('No data received from GET request. Skipping POST request.');
    return;
  }

  const url = BASE_URL;

  const payload = `status=${data.status}&approvalStatus=${data.approvalStatus}&recordType=${data.recordType}&officialName=${data.officialName}_Copy&internalOwnerID=${data.internalOwnerID}&regionID=${data.regionID}&typeID=${data.typeID}&categoryID=${data.categoryID}&countryCode=${data.countryCode}`;

  const params = {
    headers: {
      'Accept': 'application/json',
      'Authorization': AUTH_TOKEN,
      'X-Ident': X_IDENT,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  const response = http.post(url, payload, params);

  check(response, {
    'POST status is 200 or 201': (r) => r.status === 200 || r.status === 201,
  });

  console.log(`Created Profile: ${response.body}`);

  sleep(1);
}