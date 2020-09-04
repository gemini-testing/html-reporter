'use strict';

const chai = require('chai');

chai.config.includeStack = true;
chai.config.truncateThreshold = 0;
global.assert = chai.assert;

const serverPort = 8080;
const reportPath = 'test/func/fixtures/report';

module.exports = {
    baseUrl: `http://localhost:${serverPort}/${reportPath}/index.html`,

    screenshotsDir: 'test/func/main/screens',

    sets: {
        main: {
            files: 'test/func/main/**/*.hermione.js'
        }
    },

    browsers: {
        chrome: {
            windowSize: '1280x1024',
            desiredCapabilities: {
                browserName: 'chrome',
                chromeOptions: {
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
            path: 'hermione-report',
            scaleImages: true
        },
        'hermione-headless-chrome': {
            browserId: 'chrome',
            version: '77'
        },
        'hermione-global-hook': {
            beforeEach: function() {
                return this.browser
                    .url('')
                    .execute(() => {
                        document.querySelectorAll('.section').forEach((section) => {
                            const title = section.querySelector('.section__title').innerText;
                            section.setAttribute('title', title);
                        });
                    });
            }
        }
    }
};
