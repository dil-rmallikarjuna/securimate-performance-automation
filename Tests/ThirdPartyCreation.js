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
        'navigation_time': ['p(95)<5000'],
        'errors': ['rate<0.1'],
        'successful_requests': ['rate>0.9']
    }
});

export default async function () {
    console.log('Starting third party creation test...');
    
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

        // Login first to get auth tokens
        const credentials = configManager.getCredentials();
        console.log('Attempting login with credentials...');

        const loginSuccess = await loginPage.login(credentials.email, credentials.password);
        check(loginSuccess, {
            'Login successful': (success) => success === true
        }) ? reporter.addSuccess() : reporter.addError();

        // Update authentication tokens after successful login
        console.log('Updating authentication tokens...');
        const authUpdateSuccess = await authManager.updateAuthTokens(page);
        check(authUpdateSuccess, {
            'Auth tokens updated': (success) => success === true
        }) ? reporter.addSuccess() : reporter.addError();

        // Click Add Third Party button
        console.log('Looking for Add Third Party button...');
        await loginPage.clickAddThirdParty();

        // Wait for network idle after button click
        await page.waitForLoadState('networkidle', { timeout: 10000 });

        // Update add3pAuth token
        console.log('Updating add3pAuth token...');
        await authManager.updateAdd3pAuth(page);

        // Get current tokens
        const tokens = authManager.getCurrentTokens();
        console.log('Current tokens:', tokens);

        // Navigate to third party creation page
        const thirdPartyUrl = `${baseUrl}/cms/thirdparty/thirdparty_home.sec?openAdd3p=1`;
        console.log(`Navigating to: ${thirdPartyUrl}`);
        
        const startTime = new Date().getTime();
        await page.goto(thirdPartyUrl);
        const loadTime = new Date().getTime() - startTime;
        
        reporter.addNavigationTime(loadTime);
        reporter.incrementRequestCount();

        // Fill in third party details
        console.log('Filling third party details...');
        
        // Wait for form elements
        await page.waitForSelector('#np-type');
        
        // Select type
        await page.selectOption('#np-type', '2'); // 2 for Vendor
        
        // Select category
        await page.selectOption('#np-category', '6'); // 6 for IT Services
        
        // Fill company name
        await page.fill('#np-company', `TestCompany_${Date.now()}`);
        
        // Fill address
        await page.fill('#np-addr1', '123 Test Street');
        await page.fill('#np-city', 'Test City');
        await page.fill('#np-postcode', '12345');
        
        // Fill contact details
        await page.fill('#np-poc', 'Test Contact');
        await page.fill('#np-email', 'test@example.com');
        await page.fill('#np-phone1', '1234567890');

        // Submit the form
        console.log('Submitting third party form...');
        const submitStartTime = new Date().getTime();
        await page.click('#btnSubmit');
        
        // Wait for success message or redirect
        await page.waitForSelector('.alert-success', { timeout: 10000 });
        const submitTime = new Date().getTime() - submitStartTime;
        
        reporter.addCreationTime(submitTime);
        reporter.incrementRequestCount();

        // Verify success
        const successMessage = await page.textContent('.alert-success');
        check(successMessage, {
            'Third party created successfully': (msg) => msg.includes('successfully')
        }) ? reporter.addSuccess() : reporter.addError();

        // Take screenshot of result
        await loginPage.takeScreenshot('third_party_created');

        // Log performance metrics
        const metrics = await loginPage.getPerformanceMetrics();
        console.log('Performance Metrics:', metrics);

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