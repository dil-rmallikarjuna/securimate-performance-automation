/**
 * Virtual Assistance WebSocket Performance Test
 * Tests AI chat WebSocket functionality
 * 
 * Run:
 *   k6 run -e AUTH_TOKEN=your_token tests/websocket/virtual-assistance.test.js
 *   k6 run -e AUTH_TOKEN=your_token -e TEST_PROFILE=stress tests/websocket/virtual-assistance.test.js
 */

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep, fail } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { generateReport } from '../../reporters/reporter.js';
import { stressTest } from '../../profiles/load-profiles.js';
import { validateCredentials } from '../../config/credentials.js';

// Custom WebSocket metrics
const wsResponseTime = new Trend('ws_response_time');
const wsMsgsReceived = new Counter('ws_msgs_received');
const wsMsgsSent = new Counter('ws_msgs_sent');

// Test configuration
export const options = stressTest({
  scenarios: {
    websocket_stress: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 1,
      maxVUs: 10,
      stages: [
        { duration: '1m', target: 10 },
        { duration: '2m', target: 10 },
        { duration: '1m', target: 1 },
      ],
      tags: { test_type: 'websocket_stress' },
    },
  },
  thresholds: {
    'ws_response_time{test_type:websocket_stress}': ['p(90)<5000'],
    'ws_msgs_received': ['count>0'],
  },
});

/**
 * Setup - Validate credentials
 */
export function setup() {
  if (!validateCredentials()) {
    throw new Error('Invalid credentials');
  }

  console.log('\n Starting WebSocket performance test');
  console.log('   Testing Virtual Assistance AI chat functionality\n');
  
  return { startTime: Date.now() };
}

/**
 * Fetch JWT token for WebSocket connection
 */
function getWebSocketToken() {
  const authToken = __ENV.AUTH_TOKEN || '';
  const tokenEndpoint = __ENV.TOKEN_ENDPOINT || 'https://dev3.steeleglobal.net/jwt-token/create';
  
  const response = http.get(tokenEndpoint, {
    headers: { cookie: `token=${authToken}` },
  });

  if (response.status !== 200) {
    console.error(`Token fetch failed: ${response.status} - ${response.body}`);
    fail('Unable to fetch WebSocket token');
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(response.body);
  } catch (e) {
    fail(`Token parsing failed: ${e.message}`);
  }

  const token = parsedBody?.token;
  if (!token) {
    fail('Token not found in response');
  }

  return token;
}

/**
 * Main test function
 */
export default function() {
  const token = getWebSocketToken();
  
  // WebSocket connection URL
  const wsUrl = __ENV.WS_URL || `wss://rajathtpm-ai-websocket.highbond-s3.com/?source=ai-va&token=${token}`;
  
  // Test data configuration
  const thirdPartyId = __ENV.TP_ID || '1280';
  const thirdPartyNum = __ENV.TP_NUM || 'ZP3P-01734';
  const companyName = __ENV.COMPANY_NAME || 'ABC Carpet and Beverages';
  const prompt = __ENV.TEST_PROMPT || 'What are the key risk factors for this third party?';
  
  const requestPayload = {
    chatSessionId: thirdPartyNum,
    clientRequestId: `${thirdPartyNum}-${Date.now()}-${Math.floor(Math.random() * 100 + 1)}`,
    prompt: prompt,
    promptId: 'p5',
    tpId: thirdPartyId,
    tpName: companyName,
    modelName: 'anthropic.claude-3-sonnet-20240229-v1:0',
    token: token,
    msgTimestamp: Date.now().toString(),
  };

  const scenarioTag = __ENV.TEST_PROFILE || 'websocket_stress';

  ws.connect(wsUrl, {}, function(socket) {
    let startTime;

    socket.on('open', function() {
      console.log(' WebSocket connected');
      startTime = Date.now();
      
      socket.send(JSON.stringify({ 
        action: 'queryassist', 
        data: requestPayload 
      }));
      
      wsMsgsSent.add(1, { scenario: scenarioTag });
    });

    socket.on('message', function(message) {
      const responseTime = Date.now() - startTime;
      wsResponseTime.add(responseTime, { scenario: scenarioTag });
      wsMsgsReceived.add(1, { scenario: scenarioTag });
      
      console.log(` Received message in ${responseTime}ms`);
      
      try {
        const data = JSON.parse(message);
        
        check(data, {
          'WebSocket response has body': (obj) => obj.body !== undefined,
          'WebSocket response has natural language': (obj) => 
            obj.body && obj.body.natural_language_response !== undefined,
        });
        
        if (data.body?.natural_language_response) {
          console.log(` AI Response received: ${data.body.natural_language_response.substring(0, 100)}...`);
        }
      } catch (e) {
        console.error(` Failed to parse WebSocket message: ${e.message}`);
      }
      
      socket.close();
    });

    socket.on('close', function() {
      console.log(' WebSocket disconnected');
    });

    socket.on('error', function(e) {
      console.error(` WebSocket error: ${e.error}`);
      if (e.error) {
        console.error(`   Details: ${JSON.stringify(e)}`);
      }
    });

    // Keep connection alive
    sleep(1);
  });

  sleep(2);
}

/**
 * Teardown function
 */
export function teardown(data) {
  const duration = ((Date.now() - data.startTime) / 1000).toFixed(2);
  console.log(`\n WebSocket test completed in ${duration}s`);
}

/**
 * Generate test report
 */
export function handleSummary(data) {
  return generateReport(data, 'virtual-assistance-websocket');
}


