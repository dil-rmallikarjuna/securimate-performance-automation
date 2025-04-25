import { browser } from 'k6/browser';
import { check } from 'k6';
import { sleep } from 'k6';
import { LoginPage } from '../pages/LoginPage.js';
import { ConfigManager } from '../utils/ConfigManager.js';
import { TestReporter } from '../utils/TestReporter.js';
import { AuthManager } from '../utils/AuthManager.js';

const configManager = ConfigManager.getInstance();
const reporter = new TestReporter();
const authManager = AuthManager.getInstance();

export const options = configManager.getTestOptions({
    thresholds: {
        'login_time': ['p(95)<5000'],
        'errors': ['rate<0.1'],
        'successful_requests': ['rate>0.9']
    }
});

async function logTokenInfo(page) {
    const cookies = await page.context().cookies();
    const token = await page.evaluate(() => {
        const tokenElement = document.querySelector('input[name="token"]');
        return tokenElement ? tokenElement.value : 'Not found';
    });
    
    console.log('Token Information:');
    console.log('-----------------');
    console.log('Token:', token);
    console.log('Cookies:', cookies.map(c => `${c.name}=${c.value.substring(0, 10)}...`).join(', '));
    console.log('-----------------');
}

export default async function () {
    console.log('Starting test execution...');
    
    const context = await browser.newContext({
        ignoreHTTPSErrors: true,
        userAgent: 'K6 Performance Test Browser',
    });
    
    const page = await context.newPage();
    const loginPage = new LoginPage(page);

    try {
        // Get base URL for login
        const baseUrl = configManager.getBaseUrl();
        console.log(`Navigating to base URL: ${baseUrl}`);

        // Measure initial navigation
        const startTime = new Date().getTime();
        const response = await loginPage.navigate(baseUrl);
        const loadTime = new Date().getTime() - startTime;
        
        reporter.addNavigationTime(loadTime);
        reporter.incrementRequestCount();
        
        check(response, {
            'Navigation successful': (r) => r.status() === 200
        }) ? reporter.addSuccess() : reporter.addError();

        // Take initial screenshot
        await loginPage.takeScreenshot('login_page');

        // Get credentials
        const credentials = configManager.getCredentials();
        console.log('Attempting login with credentials...');

        // Measure login performance
        const loginStartTime = new Date().getTime();
        const loginSuccess = await loginPage.login(credentials.email, credentials.password);
        const loginDuration = new Date().getTime() - loginStartTime;
        
        reporter.addLoginTime(loginDuration);
        reporter.incrementRequestCount();
        
        check(loginSuccess, {
            'Login successful': (success) => success === true
        }) ? reporter.addSuccess() : reporter.addError();

        // Update authentication tokens after successful login
        console.log('Updating authentication tokens...');
        const authUpdateSuccess = await authManager.updateAuthTokens(page);
        check(authUpdateSuccess, {
            'Auth tokens updated': (success) => success === true
        }) ? reporter.addSuccess() : reporter.addError();

        // Wait for dashboard and take screenshot
        console.log('Waiting for dashboard...');
        await sleep(5);
        await loginPage.takeScreenshot('dashboard_page');

        // After successful login, click Add Third Party button
        console.log('Looking for Add Third Party button...');
        await loginPage.clickAddThirdParty();

        // Wait for network idle after button click
        await page.waitForLoadState('networkidle', { timeout: 10000 });

        // Log the current state
        console.log('Current URL:', page.url());
        console.log('Page title:', await page.title());

        // Update auth tokens and log token info
        console.log('Attempting to update auth tokens...');
        await authManager.updateAdd3pAuth(page);
        await logTokenInfo(page);

        // Verify login success
        const pageTitle = await page.title();
        const expectedTitle = 'Third-Party Manager';
        
        check(pageTitle, {
            'Page title is correct': (title) => title === expectedTitle
        }) ? reporter.addSuccess() : reporter.addError();

        // Measure overall performance
        const totalTime = new Date().getTime() - startTime;
        reporter.addPageLoadTime(totalTime);

        // Get and log performance metrics
        const metrics = await loginPage.getPerformanceMetrics();
        console.log('Performance Metrics:', metrics);
        
        // Log current authentication tokens
        const currentTokens = authManager.getCurrentTokens();
        console.log('Current Authentication Tokens:', currentTokens);
        
    } catch (error) {
        console.error('Test failed:', error);
        reporter.addError();
    } finally {
        await context.close();
    }
}

export function handleSummary(data) {
    return reporter.generateReport(data);
}