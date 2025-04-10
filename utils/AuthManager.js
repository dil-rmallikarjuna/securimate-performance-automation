import { ConfigManager } from './ConfigManager.js';

export class AuthManager {
    static #instance = null;
    #configManager = null;
    #tokens = {
        sec_sess: '',
        PHPSESSID: '',
        token: '',
        add3pAuth: '',
        tpWsAuth: ''
    };

    constructor() {
        if (AuthManager.#instance) {
            return AuthManager.#instance;
        }
        AuthManager.#instance = this;
        this.#configManager = ConfigManager.getInstance();
        this.loadTokens();
    }

    static getInstance() {
        if (!AuthManager.#instance) {
            new AuthManager();
        }
        return AuthManager.#instance;
    }

    loadTokens() {
        try {
            const configPath = import.meta.resolve ? import.meta.resolve('../config') : '../config';
            const envData = JSON.parse(open(`${configPath}/env.json`));
            this.#tokens = {
                ...this.#tokens,
                ...envData.user1
            };
            console.log('Initial tokens loaded successfully');
        } catch (error) {
            console.error('Failed to load tokens:', error);
            throw error;
        }
    }

    async updateAuthTokens(page) {
        try {
            // Wait for page to be ready
            await page.waitForLoadState('networkidle', { timeout: 30000 });
            
            // Get cookies after login
            const cookies = await page.context().cookies();
            console.log('\n=== Available Cookies ===');
            cookies.forEach(cookie => {
                console.log(`Cookie: ${cookie.name}`);
                console.log(`  Value: ${cookie.value}`);
                console.log(`  Domain: ${cookie.domain}`);
                console.log(`  Path: ${cookie.path}`);
                console.log(`  Expires: ${cookie.expires}`);
                console.log(`  HttpOnly: ${cookie.httpOnly}`);
                console.log(`  Secure: ${cookie.secure}`);
                console.log(`  SameSite: ${cookie.sameSite}`);
                console.log('------------------------');
            });
            
            // Extract required tokens
            const secSess = cookies.find(c => c.name === 'sec_sess')?.value;
            const phpSessId = cookies.find(c => c.name === 'PHPSESSID')?.value;
            const token = cookies.find(c => c.name === 'token')?.value;

            // Log token values for debugging
            console.log('\n=== Token Values ===');
            console.log('sec_sess:', secSess);
            console.log('PHPSESSID:', phpSessId);
            console.log('token:', token);
            console.log('------------------------');

            if (!secSess || !phpSessId) {
                throw new Error('Required cookies not found after login');
            }

            this.#tokens.sec_sess = secSess;
            this.#tokens.PHPSESSID = phpSessId;
            if (token) {
                this.#tokens.token = token;
            }
            
            // Log final token state
            console.log('\n=== Final Token State ===');
            console.log('Auth tokens updated in memory:', this.#tokens);
            console.log('Token string for API calls:', this.getTokenString());
            console.log('------------------------\n');
            
            return true;
        } catch (error) {
            console.error('Failed to update auth tokens:', error);
            return false;
        }
    }

    async updateAdd3pAuth(page) {
        try {
            console.log('\n=== Updating Add3pAuth Tokens ===');
            console.log('Current URL:', page.url());

            // Initialize found tokens
            let foundAdd3pAuth = '';
            let foundTpWsAuth = '';

            // First try to get tokens from JavaScript context
            const jsTokens = await page.evaluate(() => {
                try {
                    return {
                        add3pAuth: window.YAHOO?.add3p?.auth || '',
                        tpWsAuth: window.tpWsAuth || ''
                    };
                } catch (e) {
                    console.error('Error accessing window variables:', e);
                    return { add3pAuth: '', tpWsAuth: '' };
                }
            });

            if (jsTokens.add3pAuth && jsTokens.tpWsAuth) {
                console.log('Found tokens in JavaScript context');
                foundAdd3pAuth = jsTokens.add3pAuth;
                foundTpWsAuth = jsTokens.tpWsAuth;
            }

            // Look for tokens in hidden input fields if not found yet
            if (!foundAdd3pAuth || !foundTpWsAuth) {
                const hiddenInputs = await page.$$('input[type="hidden"]');
                for (const input of hiddenInputs) {
                    const name = await input.evaluate(el => el.name);
                    const value = await input.evaluate(el => el.value);
                    if (name === 'add3pAuth' && value && !foundAdd3pAuth) {
                        foundAdd3pAuth = value;
                        console.log('Found add3pAuth in hidden input');
                    }
                    if (name === 'tpWsAuth' && value && !foundTpWsAuth) {
                        foundTpWsAuth = value;
                        console.log('Found tpWsAuth in hidden input');
                    }
                }
            }

            // Check URL parameters if still not found
            if (!foundAdd3pAuth || !foundTpWsAuth) {
                try {
                    const urlObj = new URL(page.url());
                    const add3pAuthFromUrl = urlObj.searchParams.get('add3pAuth');
                    const tpWsAuthFromUrl = urlObj.searchParams.get('tpWsAuth');

                    if (add3pAuthFromUrl && !foundAdd3pAuth) {
                        foundAdd3pAuth = add3pAuthFromUrl;
                        console.log('Found add3pAuth in URL');
                    }
                    if (tpWsAuthFromUrl && !foundTpWsAuth) {
                        foundTpWsAuth = tpWsAuthFromUrl;
                        console.log('Found tpWsAuth in URL');
                    }
                } catch (e) {
                    console.error('Error parsing URL:', e.message);
                }
            }

            // Look for tokens in script tags as last resort
            if (!foundAdd3pAuth || !foundTpWsAuth) {
                const scripts = await page.$$('script');
                for (const script of scripts) {
                    const scriptContent = await script.evaluate(el => el.textContent || '');
                    if (!scriptContent) continue;

                    if (!foundAdd3pAuth) {
                        const add3pAuthMatch = scriptContent.match(/YAHOO\.add3p\.auth\s*=\s*['"]([^'"]+)['"]/);
                        if (add3pAuthMatch && add3pAuthMatch[1]) {
                            foundAdd3pAuth = add3pAuthMatch[1];
                            console.log('Found add3pAuth in script');
                        }
                    }

                    if (!foundTpWsAuth) {
                        const tpWsAuthMatch = scriptContent.match(/tpWsAuth\s*=\s*['"]([^'"]+)['"]/);
                        if (tpWsAuthMatch && tpWsAuthMatch[1]) {
                            foundTpWsAuth = tpWsAuthMatch[1];
                            console.log('Found tpWsAuth in script');
                        }
                    }

                    if (foundAdd3pAuth && foundTpWsAuth) break;
                }
            }

            // Update tokens if found
            if (foundAdd3pAuth) {
                this.#tokens.add3pAuth = foundAdd3pAuth;
                console.log('Updated add3pAuth token:', foundAdd3pAuth);
            }
            if (foundTpWsAuth) {
                this.#tokens.tpWsAuth = foundTpWsAuth;
                console.log('Updated tpWsAuth token:', foundTpWsAuth);
            }

            // Log final token state
            console.log('\n=== Final Token State ===');
            console.log('add3pAuth:', this.#tokens.add3pAuth || 'not found');
            console.log('tpWsAuth:', this.#tokens.tpWsAuth || 'not found');

            if (!this.#tokens.add3pAuth || !this.#tokens.tpWsAuth) {
                throw new Error('Required tokens not found after all attempts');
            }

            return true;
        } catch (error) {
            console.error('Failed to update add3pAuth token:', error.message);
            throw error;
        }
    }

    getCurrentTokens() {
        return { ...this.#tokens };
    }

    // Method to get token string for API calls
    getTokenString() {
        const tokens = this.getCurrentTokens();
        return Object.entries(tokens)
            .filter(([_, value]) => value) // Only include non-empty tokens
            .map(([key, value]) => `${key}=${value}`)
            .join('&');
    }
} 