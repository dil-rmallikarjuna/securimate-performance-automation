import http from "k6/http";
import { check, sleep } from "k6";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

export let options = { vus: 1, iterations: 1 };

// Load environment variables from config file
const envConfig = JSON.parse(open('../../config/clientProfile.env.json'));
const BASE_URL = envConfig.BASE_URL;
const AUTH_TOKEN = envConfig.AUTH_TOKEN;

export default function () {
    const payload = [
        "officialName=GenericCo",
        "shortName=GenericCo",
        "address1=Noida",
        "address2=Noida"
    ].join("&");

    const params = {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
            "Authorization": `Bearer ${AUTH_TOKEN}`,
            "X-Ident": "swagger-ui"
        }
    };

    const res = http.put(BASE_URL, payload, params);

    console.log("Status:", res.status);
    console.log("Response body:", res.body);
    console.log(`Content-Type: ${res.headers['Content-Type']}`);
    console.log(`Response time: ${res.timings.duration}ms`);

    // Parse response body for content validation
    let responseBody;
    try {
        responseBody = JSON.parse(res.body);
        console.log("Parsed response body:", responseBody);
        console.log("Response body type:", typeof responseBody);
    } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        console.log("Raw response body:", res.body);
        responseBody = res.body;
    }

    check(res, {
        // Status code validations
        "status is 200 or 201": (r) => r.status === 200 || r.status === 201,
        "status is not 500": (r) => r.status !== 500,
        "status is not 400": (r) => r.status !== 400,
        
        // Response time validation
        "response time < 1000ms": (r) => r.timings.duration < 1000,
        
        // Content type validation
        "content type is JSON": (r) => r.headers['Content-Type'] && r.headers['Content-Type'].includes('application/json'),
        
        // Response body validations
        "response body is not empty": (r) => r.body && r.body.length > 0,
        "response is valid JSON": (r) => {
            try {
                JSON.parse(r.body);
                return true;
            } catch (e) {
                return false;
            }
        },
        
        // Success operation validation
        "operation completed successfully": (r) => {
            if (r.status === 200 || r.status === 201) {
                const parsedBody = JSON.parse(r.body);
                return parsedBody === 0 || parsedBody === 1 || parsedBody === true;
            }
            return true;
        },
        
       
        
        // Authentication validation
        "not unauthorized due to invalid token": (r) => {
            if (r.status === 401) {
                try {
                    const body = JSON.parse(r.body);
                    return !body.error || !body.error.toLowerCase().includes('unauthorized');
                } catch (e) {
                    return true;
                }
            }
            return true;
        },
        
        // Validation error checks
        "no validation errors for valid data": (r) => {
            return r.status !== 422; // 422 means validation failed
        }
    });

    sleep(1);
}

export function handleSummary(data) {
    return {
        "../../reports/PUT_ClientProfile.html": htmlReport(data),
        stdout: textSummary(data, { indent: " ", enableColors: true }),
    };
}
