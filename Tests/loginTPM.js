import { browser } from 'k6/browser';
import { check } from 'k6';
import { sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { LoginPage } from '../Pages/LoginPage.js';  // Import the LoginPage class
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

// Create custom metrics
const navigationTime = new Trend('navigation_time');
const loginTime = new Trend('login_time');
const pageLoadTime = new Trend('page_load_time');

export const options = {
  scenarios: {
    ui: {
      executor: 'shared-iterations',
      vus: 5,
      iterations: 5,
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: {
    checks: ['rate==1.0'],
    'login_time': ['p(95)<5000'], // 95% of logins should be under 5 seconds
  },
};

export default async function () {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    userAgent: 'K6 Performance Test Browser',
  });
  
  const page = await context.newPage();
  const loginPage = new LoginPage(page);  // Create an instance of the LoginPage class

  try {
    // Measure initial navigation time
    const startTime = new Date().getTime();
    await page.goto('https://dev3.steeleglobal.net/');
    const loadTime = new Date().getTime() - startTime;
    navigationTime.add(loadTime);
    
    console.log(`Page loaded in ${loadTime}ms`);
    await page.screenshot({ path: 'screenshots/screenshot.png' });

    // Measure login performance
    const loginStartTime = new Date().getTime();
    
    // Enter credentials and log in
    const email = 'mpatro@diligent.com';
    const password = 'Milan.1217';
    await loginPage.login(email, password);  // Use loginPage to handle login logic

    const loginDuration = new Date().getTime() - loginStartTime;
    loginTime.add(loginDuration);
    
    console.log(`Login completed in ${loginDuration}ms`);
    console.log('Successfully logged in');

    // Wait for dashboard to fully load
    sleep(5);
    await page.screenshot({ path: 'screenshots/screenshot3.png' });

    // Verify login success by checking the page title
    const expectedTitle = 'Third-Party Manager';
    const pageTitle = await page.title();
    console.log(`Page title: "${pageTitle}"`);
    
    check(pageTitle, {
      'Page title is "Third-Party Manager"': (title) => title === expectedTitle,
    });

    // Measure overall page load performance
    const totalTime = new Date().getTime() - startTime;
    pageLoadTime.add(totalTime);
    console.log(`Total operation completed in ${totalTime}ms`);
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await context.close();
  }
}

export function handleSummary(data) {
  return {
    "./reports/login-test.html": htmlReport(data),
  };
}