'use strict';

const chai = require('chai');

chai.config.includeStack = true;
chai.config.truncateThreshold = 0;
global.assert = chai.assert;

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
    baseUrl: `http://localhost:${serverPort}/${fixturesPath}/index.html`,
    gridUrl: getGridUrl(),

    screenshotsDir: 'test/func/main/screens',

    sets: {
        main: {
            files: 'test/func/main'
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
            path: 'hermione-report',
            scaleImages: true
        }
    }
};
