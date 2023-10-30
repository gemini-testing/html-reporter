/*
This hermione config may be useful for running tests on a local, non-headless Chromium browser while debugging.

Use it as follows:
npm run gui:hermione-common -- -c local.hermione.conf.js
*/

process.env.SERVER_HOST = 'localhost';

const _ = require('lodash');

const mainConfig = require('./.hermione.conf.js');

const config = _.merge(mainConfig, {
    browsers: {
        chrome: {
            automationProtocol: 'devtools',
            desiredCapabilities: {
                'goog:chromeOptions': {
                    args: ['no-sandbox', 'hide-scrollbars']
                }
            },
            waitTimeout: 3000
        }
    }
});

delete config.gridUrl;
delete config.browsers.chrome.desiredCapabilities['goog:chromeOptions'].binary;

module.exports = config;
