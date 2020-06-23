'use strict';

global.assert = require('chai').assert;

const serverPort = 8080;
const fixturesPath = 'test/func/fixtures/report';

module.exports = {
    baseUrl: `http://localhost:${serverPort}/test/func/fixtures/index.html`,

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
        },
        'hermione-headless-chrome': {
            browserId: 'chrome',
            version: '77'
        }
    }
};
