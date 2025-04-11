import { UtilPage } from '../utils/UtilPage.js';
import { check } from 'k6';

export class BasePage {
    constructor(page) {
        this.page = page;
        this.utils = new UtilPage(page);
        this.logger = console;
    }

    async navigate(url) {
        try {
            const response = await this.page.goto(url);
            check(response, {
                'Navigation successful': (r) => r.status() === 200
            });
            return response;
        } catch (error) {
            this.logger.error(`Navigation failed: ${error.message}`);
            throw error;
        }
    }

    async waitForSelector(selector, options = {}) {
        try {
            await this.page.waitForSelector(selector, options);
            return true;
        } catch (error) {
            this.logger.error(`Element not found: ${selector}`);
            return false;
        }
    }

    async takeScreenshot(name) {
        try {
            await this.page.screenshot({ 
                path: `screenshots/${name}_${Date.now()}.png`,
                fullPage: true
            });
        } catch (error) {
            this.logger.error(`Screenshot failed: ${error.message}`);
        }
    }

    async getPerformanceMetrics() {
        const metrics = await this.page.evaluate(() => ({
            loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
            domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
            firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
            firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
        }));
        return metrics;
    }
}
