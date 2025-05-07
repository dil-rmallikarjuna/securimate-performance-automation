import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep, fail } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { token2, selectedThirdParty } from '../../config/config.js'; // Import token and test data

// Metrics with tags
const wsResponseTime = new Trend('ws_response_time');
const wsMsgsReceived = new Counter('ws_msgs_received');
const wsMsgsSent = new Counter('ws_msgs_sent');

export const options = {
    scenarios: {
        stress_test: {
            executor: 'ramping-arrival-rate',
            startRate: 10,
            timeUnit: '1s',
            preAllocatedVUs: 1,
            maxVUs: 1,
            stages: [
                { duration: '1m', target: 1 },
              
            ],
            tags: { scenario: 'stress_test' },
        },
        
    },
    thresholds: {
        'ws_response_time{scenario:stress_test}': ['p(90)<5000'],
    },
};

// Function to fetch the token
function getToken() {
    const response = http.get('https://dev3.steeleglobal.net/jwt-token/create', {
        headers: { 'cookie': `token=${token2}` },
    });

    if (response.status !== 200) {
        console.error(`Token fetch failed with status: ${response.status}, body: ${response.body}`);
        fail('Unable to fetch token');
    }

    let parsedBody;
    try {
        parsedBody = JSON.parse(response.body);
    } catch (e) {
        fail(`Token fetch response parsing failed: ${e.message}`);
    }

    const token = parsedBody?.token;
    if (!token) fail('Token not found in the response');
    return token;
}

// WebSocket test
export default function () {
    const token = getToken();
    const wsUrl = `wss://rajathtpm-ai-websocket.highbond-s3.com/?source=ai-va&token=${token}`;
    const requestPayload = {
        chatSessionId: selectedThirdParty.tpNum,
        clientRequestId: `${selectedThirdParty.tpNum}-${new Date().valueOf()}-${Math.floor((Math.random() * 100) + 1)}`,
        prompt: selectedThirdParty.prompt,
        promptId: "p5",
        tpId: selectedThirdParty.id,
        tpName: selectedThirdParty.companyName,
        modelName: "anthropic.claude-3-sonnet-20240229-v1:0",
        token: token,
        msgTimestamp: new Date().valueOf().toString(),
    };

    // Tag for current scenario
    const scenarioTag = __ENV.SCENARIO || 'unknown';

    ws.connect(wsUrl, {}, function (socket) {
        let startTime;

        socket.on('open', function open() {
            console.log('Connected to WebSocket');
            startTime = new Date();
            socket.send(JSON.stringify({ action: "queryassist", data: requestPayload }));
            wsMsgsSent.add(1, { scenario: scenarioTag });
        });

        socket.on('message', function (message) {
            const responseTime = new Date() - startTime;
            wsResponseTime.add(responseTime, { scenario: scenarioTag });
            wsMsgsReceived.add(1, { scenario: scenarioTag });
            console.log(`Received message: ${message}, Response time: ${responseTime}ms`);
            const data = JSON.parse(message);
            check(data, {
                'response contains expected field': (obj) => obj.body && obj.body.natural_language_response !== undefined,
            });
            socket.close();
        });

        socket.on('close', () => console.log('Disconnected from WebSocket'));
        socket.on('error', (e) => console.error(`WebSocket error: ${e.error}, Details: ${JSON.stringify(e)}`));

        sleep(1); 
    });
}
