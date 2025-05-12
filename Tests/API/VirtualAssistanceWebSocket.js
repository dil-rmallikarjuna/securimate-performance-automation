import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep, fail } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

// All config and test data loaded from environment variables
const TOKEN2 = __ENV.TOKEN2 || '';
const TOKEN_URL = __ENV.TOKEN_URL || '';
const WEBSOCKET_URL = __ENV.WEBSOCKET_URL || '';
const COMPANY_NAME = __ENV.COMPANY_NAME || '';
const TP_ID = __ENV.TP_ID || '';
const TP_NUM = __ENV.TP_NUM || '';
const PROMPT = __ENV.PROMPT || '';
const MODEL_NAME = __ENV.MODEL_NAME || 'anthropic.claude-3-sonnet-20240229-v1:0';

const wsResponseTime = new Trend('ws_response_time');
const wsMsgsReceived = new Counter('ws_msgs_received');
const wsMsgsSent = new Counter('ws_msgs_sent');

export const options = {
    scenarios: {
        stress_test: {
            executor: 'ramping-arrival-rate',
            startRate: Number(__ENV.START_RATE) || 10,
            timeUnit: '1s',
            preAllocatedVUs: Number(__ENV.PREALLOCATED_VUS) || 1,
            maxVUs: Number(__ENV.MAX_VUS) || 1,
            stages: [
                { duration: '1m', target: Number(__ENV.STAGE1_TARGET) || 1 },
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
    const response = http.get(TOKEN_URL, {
        headers: { 'cookie': `token=${TOKEN2}` },
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
    const wsUrl = `${WEBSOCKET_URL}?source=ai-va&token=${token}`;
    const requestPayload = {
        chatSessionId: TP_NUM,
        clientRequestId: `${TP_NUM}-${new Date().valueOf()}-${Math.floor((Math.random() * 100) + 1)}`,
        prompt: PROMPT,
        promptId: "p5",
        tpId: TP_ID,
        tpName: COMPANY_NAME,
        modelName: MODEL_NAME,
        token: token,
        msgTimestamp: new Date().valueOf().toString(),
    };

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