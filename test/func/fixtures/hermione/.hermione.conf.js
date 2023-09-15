'use strict';

const {GRID_URL, CHROME_BINARY_PATH} = require('../../utils/constants');
global.assert = require('chai').assert;

const serverPort = 8080;
const fixturesPath = 'test/func/fixtures/hermione/report';

module.exports = {
    gridUrl: GRID_URL,
    baseUrl: `http://localhost:${serverPort}/test/func/fixtures/hermione/index.html`,

    screenshotsDir: 'test/func/fixtures/screens',

    sets: {
        fixtures: {
            files: 'test/func/fixtures/**/*.hermione.js'
        }
    },

    browsers: {
        chrome: {
            windowSize: '1280x1024',
            desiredCapabilities: {
                browserName: 'chrome',
                'goog:chromeOptions': {
                    args: ['headless', 'no-sandbox'],
                    binary: CHROME_BINARY_PATH,
                }
            }
        }
    },

    plugins: {
        'html-reporter-test-server': {
            enabled: true,
            port: serverPort
        },
        'html-reporter-tester': {
            enabled: true,
            path: fixturesPath,
        },
    }
};
