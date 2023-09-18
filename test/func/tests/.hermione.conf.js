'use strict';

const path = require('path');

const chai = require('chai');
const {GRID_URL, CHROME_BINARY_PATH} = require('../utils/constants');

chai.config.includeStack = true;
chai.config.truncateThreshold = 0;
global.assert = chai.assert;

const serverHost = process.env.SERVER_HOST ?? 'host.docker.internal';
const serverPort = process.env.SERVER_PORT ?? 8083;
const projectUnderTest = process.env.PROJECT_UNDER_TEST;

if (!projectUnderTest) {
    throw 'Project under test was not specified';
}

module.exports = {
    gridUrl: GRID_URL,
    baseUrl: `http://${serverHost}:${serverPort}/fixtures/${projectUnderTest}/report/index.html`,

    screenshotsDir: path.resolve(__dirname, 'screens'),

    sets: {
        common: {
            files: 'common/**/*.hermione.js'
        },
        plugins: {
            files: 'plugins/**/*.hermione.js'
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
