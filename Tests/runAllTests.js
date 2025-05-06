import { browser } from 'k6/browser';
import { check } from 'k6';
import { LoginPage } from '../Pages/LoginPage.js';

// Read credentials from environment variables
const users = [
    { email: __ENV.USER1_EMAIL, password: __ENV.USER1_PASSWORD },
    { email: __ENV.USER2_EMAIL, password: __ENV.USER2_PASSWORD }
];

export const options = {
    scenarios: {
        ui: {
            executor: 'shared-iterations',
            vus: users.length,
            iterations: users.length,
            options: {
                browser: {
                    type: 'chromium',
                },
            },
        },
    },
};

export default async function () {
    const user = users[__VU - 1];

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