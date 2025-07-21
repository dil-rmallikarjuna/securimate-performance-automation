import http from "k6/http";
import { check } from "k6";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

const AUTH_TOKEN = "a5bbee1af493f9e19d07879ba3720c76d2f72d3e";
const url = "https://api.tpm.diligentoneplatform-dev.com/rest/clientProfile";

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

    const res = http.put(url, payload, params);

    console.log("Status:", res.status);
    console.log("Response body:", res.body);

    check(res, {
        "status is 200": (r) => r.status === 200,
    });
}

export function handleSummary(data) {
    return {
        "reports/Put_clientProfile.html": htmlReport(data),
    };
}
