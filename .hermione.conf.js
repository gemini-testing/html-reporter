'use strict';

const chai = require('chai');

chai.config.includeStack = true;
chai.config.truncateThreshold = 0;
global.assert = chai.assert;

const serverPort = 8080;
const fixturesPath = 'test/func/fixtures/report';

module.exports = {
    baseUrl: `http://localhost:${serverPort}/${fixturesPath}/index.html`,
    gridUrl: 'http://localhost:4444/wd/hub',

    screenshotsDir: 'test/func/main/screens',

    sets: {
        main: {
            files: 'test/func/main'
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
            path: 'hermione-report',
            scaleImages: true
        }
    }
};
