import { SharedArray } from 'k6/data';

export class ConfigManager {
    static #instance = null;
    #config = null;
    #credentials = null;
    #urls = null;

    constructor() {
        if (ConfigManager.#instance) {
            return ConfigManager.#instance;
        }
        ConfigManager.#instance = this;
        this.loadConfigs();
    }

    static getInstance() {
        if (!ConfigManager.#instance) {
            new ConfigManager();
        }
        return ConfigManager.#instance;
    }

    loadConfigs() {
        try {
            const configPath = import.meta.resolve ? import.meta.resolve('../config') : '../config';
            
            // Load credentials
            this.#credentials = JSON.parse(open(`${configPath}/credentials.json`));

            // Load URLs
            this.#urls = JSON.parse(open(`${configPath}/urls.json`));

            // Load environment config
            this.#config = JSON.parse(open(`${configPath}/env.json`));

            console.log('Configurations loaded successfully');
        } catch (error) {
            console.error('Failed to load configurations:', error);
            throw error;
        }
    }

    getConfig() {
        return this.#config;
    }

    getCredentials(env = 'dev3') {
        if (!this.#credentials || !this.#credentials[env]) {
            throw new Error(`No credentials found for environment: ${env}`);
        }
        return this.#credentials[env];
    }

    getBaseUrl(env = 'dev3') {
        if (!this.#urls || !this.#urls[env] || !this.#urls[env].baseUrl) {
            throw new Error(`No base URL found for environment: ${env}`);
        }
        return this.#urls[env].baseUrl;
    }

    getApiUrl(env = 'dev3') {
        if (!this.#urls || !this.#urls[env] || !this.#urls[env].apiUrl) {
            throw new Error(`No API URL found for environment: ${env}`);
        }
        return this.#urls[env].apiUrl;
    }

    getTestOptions(options = {}) {
        const defaultOptions = {
            scenarios: {
                ui: {
                    executor: 'shared-iterations',
                    vus: 1, // Reduced to 1 for initial testing
                    iterations: 1, // Reduced to 1 for initial testing
                    options: {
                        browser: {
                            type: 'chromium',
                            headless: false, // Set to false to see the browser
                            args: ['--no-sandbox', '--disable-dev-shm-usage']
                        },
                    },
                },
            },
            thresholds: {
                checks: ['rate==1.0'],
                http_req_duration: ['p(95)<5000'],
            },
        };

        return { ...defaultOptions, ...options };
    }
} 