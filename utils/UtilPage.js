export class UtilPage {
    constructor(page) {
      this.page = page;
    }
  
    // Simulate a click action on an element
    async clickElement(selector) {
      await this.page.locator(selector).click();
    }
  
    // Simulate entering text into an input field
    async enterText(selector, text) {
      await this.page.locator(selector).fill(text);  // fill() clears the input before typing
    }
  
    // Simulate waiting for navigation to finish
    async waitForNavigation(timeout = 5000) {
      await this.page.waitForTimeout(timeout); // Waits for timeout
    }
  
    // Get text content from a specific element
    async getText(selector) {
      return await this.page.locator(selector).textContent();
    }
  
    // Check if an element is visible
    async isVisible(selector) {
      const element = await this.page.locator(selector);
      return await element.isVisible();
    }
  }
  