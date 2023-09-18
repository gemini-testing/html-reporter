'use strict';

const path = require('path');

const {GRID_URL, CHROME_BINARY_PATH} = require('../../utils/constants');
global.assert = require('chai').assert;

const serverHost = process.env.SERVER_HOST ?? 'host.docker.internal';
const serverPort = process.env.SERVER_PORT ?? 8081;
const fixturesPath = 'report';

module.exports = {
    gridUrl: GRID_URL,
    baseUrl: `http://${serverHost}:${serverPort}/fixtures/hermione/index.html`,

    screenshotsDir: path.resolve(__dirname, 'screens'),

    sets: {
        fixtures: {
            files: '**/*.hermione.js'
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
