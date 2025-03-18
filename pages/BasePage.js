import { UtilPage } from '../utils/UtilPage.js';

export class BasePage {
    constructor(baseUrl) {
        this.utils = new UtilPage(baseUrl);
    }

    async navigate(path) {
        return this.utils.waitForNavigation();
    }
}
