import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

// Disable TLS certificate verification globally
__ENV.K6_INSECURE_SKIP_TLS_VERIFY = "true";

// Load credentials from `config/env.json`
const envfile = JSON.parse(open("../config/env.json"));
// Load base URL from `config/urls.json`
const urls = JSON.parse(open("../config/urls.json"));
const envBaseUrl = urls.baseurl; // Ensure the JSON contains { "baseurl": "https://your-url.com" }
const baseUrl = envBaseUrl + "/cms/thirdparty/tp-ws.php";

// Custom metric for response time tracking
const responseTime = new Trend("response_time", true);

export const options = {
  scenarios: {
    baseline_load_test: {
      executor: "ramping-arrival-rate",
      startRate: 10,
      timeUnit: "1s",
      preAllocatedVUs: 2,
      maxVUs: 6,
      stages: [
        { duration: "1m", target: 6 },
      ],
      tags: { scenario: "baseline_load_test" }
    }
  }
};

export default function () {
  // Select a user dynamically
  const userKeys = Object.keys(envfile);
  const selectedUserKey = userKeys[__VU % userKeys.length]; // Round-robin selection
  const currentUser = envfile[selectedUserKey];

  console.log(`🚀 [INFO] User '${selectedUserKey}' is executing the request.`);

  const headers = {
    Accept: "*/*",
    "Accept-Language": "en-GB,en;q=0.9",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    Cookie: `sec_sess=${currentUser.sec_sess}; PHPSESSID=${currentUser.PHPSESSID}; token=${currentUser.token}`,
    Origin: envBaseUrl,
    Referer: envBaseUrl + "/cms/thirdparty/thirdparty_home.sec",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
    "X-Requested-With": "XMLHttpRequest"
  };

  const postData = {
    "op": "np-save",
    "add3pAuth": currentUser.add3pAuth,
    "np-type": 2,
    "np-category": 6,
    "np-country": "IN",
    "np-state": "",
    "np-department": 0,
    "np-region": 429,
    "np-parent": "",
    "np-company": `PerfTest_${selectedUserKey}_${Math.random().toString(36).substring(7)}`,
    "np-dbaname": "",
    "np-internalcode": "",
    "np-addr1": "",
    "np-addr2": "",
    "np-city": "",
    "np-postcode": "",
    "np-poc": "",
    "np-email": "",
    "np-phone1": "",
    "np-phone2": "",
    "case": 0,
    "clr": ""
  };

  const encodedPostData = Object.keys(postData)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(postData[key])}`)
    .join("&");

  console.log(`🔄 [REQUEST] User '${selectedUserKey}' sending request to ${baseUrl}`);

  // Make the POST request and bypass TLS verification
  const response = http.post(baseUrl, encodedPostData, {
    headers: headers,
    timeout: "60s",
    tags: { name: "bypass_tls_test" }
  });

  console.log("Response is : " + response.body);

  // Record response time
  responseTime.add(response.timings.duration);

  if (response.status === 0) {
    console.error(`❌ [ERROR] User '${selectedUserKey}' request failed due to TLS issue or network error.`);
  } else {
    console.log(`✅ [RESPONSE] User '${selectedUserKey}', Status: ${response.status}, Time: ${response.timings.duration}ms`);
  }

  // Check response
  check(response, {
    "is status 200": (r) => r.status === 200
  }) || console.error(`❌ [ERROR] User '${selectedUserKey}' received status ${response.status}`);

  sleep(1); // Short delay between requests
}