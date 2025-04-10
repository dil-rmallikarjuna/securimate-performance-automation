import http from 'k6/http';
import { check, sleep } from 'k6';
import { CONFIG } from '../config/config.js';

// Load test scenarios
export const options = {
  scenarios: {
    load_test: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 1 },
        { duration: '10s', target: 1 }, 
        { duration: '10s', target: 1 }, 
      ],
    },
  },
};

let fetchedData = null; 

export function setup() {
  const getUrl = `${CONFIG.BASE_URL}/${getTPrefrence}`;
  const response = http.get(getUrl, { headers: CONFIG.HEADERS });

  check(response, {
    'GET status is 200': (r) => r.status === 200,
  });

  if (response.status === 200) {
    fetchedData = response.json(); 
    console.log(`Fetched Profile Data: ${JSON.stringify(fetchedData)}`);
  } else {
    console.error(`Failed to fetch data: ${response.status}`);
  }

  return fetchedData; 
}

export default function (data) {
  if (!data) {
    console.error('No data received from GET request. Skipping POST request.');
    return;
  }

  const url = CONFIG.BASE_URL;
  
  const payload = `status=${data.status}&approvalStatus=${data.approvalStatus}&recordType=${data.recordType}&officialName=${data.officialName}_Copy&internalOwnerID=${data.internalOwnerID}&regionID=${data.regionID}&typeID=${data.typeID}&categoryID=${data.categoryID}&countryCode=${data.countryCode}`;

  const params = {
    headers: {
      ...CONFIG.HEADERS,
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
