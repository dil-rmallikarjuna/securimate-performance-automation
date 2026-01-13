import http from "k6/http";
import { check } from "k6";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

export default function () {
    const url = "https://api-dev3.steeleglobal.net/rest/engagement";
    const payload = {
        engagementParentID: 36039,
        officialName: "ISO PA Priyansu Test 6",
        internalOwnerID: 692,
        regionID: 1,
        typeID: 1,
        categoryID: 10,
        countryCode: "TL"
    }; 

    const params = {
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": "Bearer 23d3176a114b442df78d221724d480ded3b68d24",
            "X-Ident": "swagger-ui"
        }
    };

    const res = http.post(url, JSON.stringify(payload), params);

    check(res, {
        "status is 200": (r) => r.status === 200,
        "has id": (r) => !!r.json("id"),
        "has engagementNumber": (r) => !!r.json("engagementNumber"),
    });

    console.log("Response body:", res.body);
}

export function handleSummary(data) {
    return {
        "Tests/reports/POST_Engagement.html": htmlReport(data),
    };
}
