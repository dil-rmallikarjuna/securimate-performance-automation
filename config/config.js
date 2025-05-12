// All values are now loaded from environment variables
export const token2 = __ENV.TOKEN2 || '';

// Test Data for Virtual assistance websocket
export const selectedThirdParty = {
    companyName: __ENV.COMPANY_NAME || '',
    id: __ENV.TP_ID || '',
    tpNum: __ENV.TP_NUM || '',
    prompt: __ENV.PROMPT || '',
};

export const CONFIG = {
    BASE_URL: __ENV.BASE_URL || '',
    AUTH_TOKEN: __ENV.AUTH_TOKEN || '',
    HEADERS: {
        'Accept': 'application/json',
        'Authorization': __ENV.AUTH_TOKEN || '',
        'X-Ident': __ENV.X_IDENT || '',
    },
};

export const getTPrefrence = __ENV.TP_REFERENCE || '';