import http from 'k6/http';
import { check } from 'k6';
import { CONFIG } from '../config//config.js';

export default function () {
  const url = `${CONFIG.BASE_URL}/ZP3P-1740494125`;
  
  const response = http.get(url, { headers: CONFIG.HEADERS });

  check(response, {
    'is status 200': (r) => r.status === 200,
    'response contains data': (r) => r.json('id') !== undefined,
  });

  console.log(`Response: ${response.body}`);
}
