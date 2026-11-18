'use strict';

module.exports = {
    gridUrl: 'local',
    headless: true,
    baseUrl: process.env.NETWORK_E2E_URL,
    timeTravel: {mode: process.env.NETWORK_E2E_MODE, network: true},
    retry: 1,
    takeScreenshotOnFails: {testFail: false},
    sets: {default: {files: ['requests.testplane.js']}},
    browsers: {
        chrome: {
            desiredCapabilities: {
                browserName: 'chrome',
                'goog:chromeOptions': {args: ['--no-sandbox', '--disable-dev-shm-usage']}
            }
        },
        firefox: {desiredCapabilities: {browserName: 'firefox'}}
    },
    plugins: {
        'html-reporter-tester': {
            path: process.env.NETWORK_E2E_REPORT,
            secretConfigFilter: (_value, field) => {
                if (field.toLowerCase() === 'network-request.header.x-fixture-account') {
                    return '[redacted]';
                }
            }
        }
    },
    system: {workers: 1}
};
