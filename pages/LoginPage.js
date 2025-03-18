import { UtilPage } from '../utils/UtilPage.js';

export class LoginPage {
  constructor(page) {
    this.util = new UtilPage(page);  // Initialize the UtilPage class
    this.emailField = 'input[name="email"]';
    this.passwordField = 'input[name="password"]';
    this.submitButton = 'input[type="submit"]';
  }

  // Method to perform login by typing email, password, and clicking the submit button
  async login(email, password) {
    await this.util.enterText(this.emailField, email);  // Enter email
    await this.util.enterText(this.passwordField, password);  // Enter password
    await this.util.clickElement(this.submitButton);  // Click submit button
    await this.util.waitForNavigation(5000);  // Wait for navigation (5 seconds)
  }

  // Method to check if the page title is correct after login
  async verifyLoginTitle(expectedTitle) {
    const pageTitle = await this.util.getText('title');  // Fetch the page title
    return pageTitle === expectedTitle;
  }
}
