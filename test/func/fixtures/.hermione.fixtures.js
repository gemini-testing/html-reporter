'use strict';

global.assert = require('chai').assert;

const serverPort = 8080;
const fixturesPath = 'test/func/fixtures/report';

const getGridUrl = () => {
    const {SAUCE_USERNAME, SAUCE_ACCESS_KEY} = process.env;

    if (SAUCE_USERNAME && SAUCE_ACCESS_KEY) {
        return `http://${SAUCE_USERNAME}:${SAUCE_ACCESS_KEY}@ondemand.saucelabs.com/wd/hub`;
    }

    console.warn('No "SAUCE_USERNAME" and "SAUCE_ACCESS_KEY" env was found. Local grid will be used.');

    return 'http://localhost:4444/wd/hub';
};

module.exports = {
    baseUrl: `http://localhost:${serverPort}/test/func/fixtures/index.html`,
    gridUrl: getGridUrl(),

    screenshotsDir: 'test/func/fixtures/screens',

    sets: {
        fixtures: {
            files: 'test/func/fixtures'
        }
    },

    browsers: {
        chrome: {
            windowSize: '1280x1024',
            desiredCapabilities: {
                browserName: 'chrome',
                'tunnel-identifier': process.env.TRAVIS_JOB_NUMBER
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
