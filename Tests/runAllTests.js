import { browser } from 'k6/browser';
import { check } from 'k6';
import { LoginPage } from '../pages/LoginPage.js';

const users = [
    { email: "mpatro@diligent.com", password: "Welcome@1234" },
    { email: "najha@diligent.com", password: "Welcome@1234" }
];

export const options = {
    vus: users.length,
    iterations: users.length,
};

export default async function () {
    const user = users[__VU - 1]; // Each VU gets a unique user

    const context = await browser.newContext({
        ignoreHTTPSErrors: true,
        userAgent: 'K6 Performance Test Browser',
    });

    const page = await context.newPage();
    const loginPage = new LoginPage(page);

    // Example login flow
    await page.goto('https://dev3.steeleglobal.net/');
    await loginPage.login(user.email, user.password);

    check(page.url(), {
        'Logged in and redirected': (url) => url.includes('dashboard')
    });

    await page.close();
    await context.close();
}