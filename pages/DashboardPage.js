import { BasePage } from './BasePage.js';


export class DashboardPage extends BasePage {
    constructor(baseUrl) {
        super(baseUrl);
        this.selectors = {
            welcomeMessage: '.welcome-msg',
            logoutButton: '#logout-btn'
        };
    }

    async getWelcomeMessage() {
        return await this.utils.getText(this.selectors.welcomeMessage);
    }

    async logout() {
        await this.utils.click(this.selectors.logoutButton);
        await this.utils.waitForNavigation();
    }
}
