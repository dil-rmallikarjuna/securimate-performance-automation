# securimate-performance-automation
# use this command to run test via k6 
# - k6 run loginTPM.js (navigate to tests folder before)
# use this command to run test via docker 
# docker run --rm -i -v C:\Users\najha\securimate-performance-automation:/app -w /app grafana/k6:master-with-browser run Tests/LoginTPM.js
# reports are generated in cli as well as reports folder under tests folder.
# dotenv -e .env -- k6 run Tests/runAllTests.js

#For API test cases make sure to add relevant data and token in config file
## Environment Variables

All configuration (URLs, credentials, headers, test data) is now managed via environment variables.
You can store these in a `.env` file in your project root.

### Example `.env` file

```env
USER1_EMAIL=mpatro@diligent.com
USER1_PASSWORD=Welcome@1234
USER2_EMAIL=najha@diligent.com
USER2_PASSWORD=Welcome@1234
BASE_URL=https://api-staging.steeleglobal.net/rest/thirdparty/profile
AUTH_TOKEN=Bearer tokenHere
X_IDENT=swagger-ui
TOKEN2=your_token_here
COMPANY_NAME=ABC Carpet and Beverages
TP_ID=1280
TP_NUM=ZP3P-01734
PROMPT=Are there incomplete DDQ invites or forms for this third party profile
TP_REFERENCE=ZP3P-01395
```

### Running with dotenv-cli

Install dotenv-cli if you haven't:
```bash
npm install -g dotenv-cli
```

Run your test:
```bash
dotenv -e .env -- k6 run Tests/runAllTests.js
```