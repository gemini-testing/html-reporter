/*
This hermione config may be useful for running tests on a local, non-headless Chromium browser while debugging.

Use it as follows:
npm run gui:hermione-common -- -c local.hermione.conf.js
*/

process.env.SERVER_HOST = 'localhost';

const _ = require('lodash');

const mainConfig = require('./.hermione.conf.js');

// Make sure to adjust chromium binary path to a desired Chromium location.
const CHROME_BINARY_PATH = '/Applications/Chromium.app/Contents/MacOS/Chromium';

const config = _.merge(mainConfig, {
    // Default chromedriver host and port. Adjust to your needs.
    gridUrl: 'http://localhost:9515/',

    browsers: {
        chrome: {
            desiredCapabilities: {
                'goog:chromeOptions': {
                    args: ['no-sandbox', 'hide-scrollbars'],
                    binary: CHROME_BINARY_PATH
                }
            },
            waitTimeout: 3000
        }
    }
});

module.exports = config;
