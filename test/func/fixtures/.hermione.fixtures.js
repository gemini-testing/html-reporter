'use strict';

global.assert = require('chai').assert;

const serverPort = 8080;
const fixturesPath = 'test/func/fixtures/report';

module.exports = {
    baseUrl: `http://localhost:${serverPort}/test/func/fixtures/index.html`,
    gridUrl: 'http://localhost:4444/wd/hub',

    screenshotsDir: 'test/func/fixtures/screens',

    sets: {
        fixtures: {
            files: 'test/func/fixtures'
        }
    },

    browsers: {
        chrome: {
            desiredCapabilities: {
                browserName: 'chrome'
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
            path: fixturesPath
        }
    }
};
