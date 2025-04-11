export class UtilPage {
    constructor(page) {
        this.page = page;
        this.logger = console;
    }

    async clickElement(selector, options = {}) {
        try {
            await this.page.locator(selector).click(options);
            return true;
        } catch (error) {
            this.logger.error(`Click failed on selector: ${selector}`, error);
            return false;
        }
    }

    async enterText(selector, text, options = {}) {
        try {
            await this.page.locator(selector).fill(text, options);
            return true;
        } catch (error) {
            this.logger.error(`Text entry failed on selector: ${selector}`, error);
            return false;
        }
    }

    async waitForNavigation(options = { timeout: 5000 }) {
        try {
            await this.page.waitForLoadState('networkidle', options);
            return true;
        } catch (error) {
            this.logger.error('Navigation timeout', error);
            return false;
        }
    }

    async getText(selector) {
        try {
            return await this.page.locator(selector).textContent();
        } catch (error) {
            this.logger.error(`Failed to get text from selector: ${selector}`, error);
            return null;
        }
    }

    async isVisible(selector, timeout = 5000) {
        try {
            const element = this.page.locator(selector);
            await element.waitFor({ state: 'visible', timeout });
            return true;
        } catch (error) {
            return false;
        }
    }

    async selectDropdown(selector, value) {
        try {
            await this.page.locator(selector).selectOption(value);
            return true;
        } catch (error) {
            this.logger.error(`Dropdown selection failed: ${selector}`, error);
            return false;
        }
    }

    async waitForNetworkIdle(timeout = 5000) {
        try {
            await this.page.waitForLoadState('networkidle', { timeout });
            return true;
        } catch (error) {
            this.logger.error('Network idle timeout', error);
            return false;
        }
    }

    async measureElementLoadTime(selector) {
        const startTime = Date.now();
        try {
            await this.page.waitForSelector(selector, { state: 'visible' });
            return Date.now() - startTime;
        } catch (error) {
            this.logger.error(`Element load timeout: ${selector}`, error);
            return -1;
        }
    }

    async getElementCount(selector) {
        try {
            return await this.page.locator(selector).count();
        } catch (error) {
            this.logger.error(`Failed to get element count: ${selector}`, error);
            return 0;
        }
    }
}
  