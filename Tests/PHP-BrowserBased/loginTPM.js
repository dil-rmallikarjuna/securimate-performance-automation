import { browser } from 'k6/browser';
import { check } from 'k6';
//import { sleep } from 'k6';
import { LoginPage } from '../Pages/LoginPage.js';

const users = [
    { email: "mpatro@diligent.com", password: "Welcome@1234" },
    { email: "najha@diligent.com", password: "Welcome@1234" }
];

export const options = {
    scenarios: {
        ui: {
            executor: 'shared-iterations',
            vus: 2,
            iterations: 2,
            options: {
                browser: {
                    type: 'chromium',
                },
            },
        },
    },
};

export default async function () {
    const user = users[__VU - 1]; // Each VU gets a unique user

    const context = await browser.newContext({
        ignoreHTTPSErrors: true,
        userAgent: 'K6 Performance Test Browser',
    });

    const page = await context.newPage();
    const loginPage = new LoginPage(page);

    await page.goto('https://dev3.steeleglobal.net/');
    await loginPage.login(user.email, user.password);

    check(page.url(), {
        'Logged in and redirected': (url) => url.includes('dashboard')
    });

    await page.close();
    await context.close();
}