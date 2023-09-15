'use strict';

const chai = require('chai');
const {GRID_URL, CHROME_BINARY_PATH} = require('../utils/constants');

chai.config.includeStack = true;
chai.config.truncateThreshold = 0;
global.assert = chai.assert;

const serverPort = 8080;
const projectUnderTest = process.env.PROJECT_UNDER_TEST;

module.exports = {
    gridUrl: GRID_URL,
    baseUrl: `http://localhost:${serverPort}/test/func/fixtures/${projectUnderTest}/report/index.html`,

    screenshotsDir: 'test/func/tests/screens',

    sets: {
        main: {
            files: 'test/func/tests/common/**/*.hermione.js'
        },
        plugins: {
            files: 'test/func/tests/plugins/**/*.hermione.js'
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
                    mobileEmulation: {deviceMetrics: {pixelRatio: 1}}
                }
            },
            waitTimeout: 3000
        }
    },

    plugins: {
        'html-reporter-test-server': {
            enabled: true,
            port: serverPort
        },
        'html-reporter-tester': {
            enabled: true,
            path: `reports/${projectUnderTest}`,
            diffMode: '3-up'
        },

        'hermione-global-hook': {
            beforeEach: async function() {
                await this.browser.url(this.browser.options.baseUrl);
                await this.browser.execute(() => {
                    document.querySelectorAll('.section').forEach((section) => {
                        const title = section.querySelector('.section__title').innerText;
                        section.setAttribute('title', title);
                    });
                });
            }
        }
    }
};
