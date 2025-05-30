'use strict';

const path = require('path');

const chai = require('chai');
const _ = require('lodash');
const {getCommonConfig} = require('../common.testplane.conf');

chai.config.includeStack = true;
chai.config.truncateThreshold = 0;
global.assert = chai.assert;

const serverHost = process.env.SERVER_HOST ?? 'host.docker.internal';
const serverPort = process.env.SERVER_PORT ?? 8083;
const projectUnderTest = process.env.PROJECT_UNDER_TEST;

const isRunningGuiTests = (projectUnderTest && projectUnderTest.includes('gui')) || projectUnderTest === 'db-migrations';
const isRunningAnalyticsTests = projectUnderTest && projectUnderTest.includes('analytics');

if (!projectUnderTest) {
    console.warn('Project under test was not specified');
}

const commonConfig = getCommonConfig(__dirname);

const config = _.merge(commonConfig, {
    retry: 4,
    baseUrl: `http://${serverHost}:${serverPort}/fixtures/${projectUnderTest}/report/`,
    timeTravel: 'on',

    sets: {
        common: {
            files: 'common/**/*.testplane.js'
        },
        'common-gui': {
            files: 'common-gui/**/*.testplane.js'
        },
        'common-tinder': {
            files: 'common-tinder/**/*.testplane.js'
        },
        eye: {
            files: 'eye/**/*.testplane.js',
        },
        plugins: {
            files: 'plugins/**/*.testplane.js'
        },
        analytics: {
            files: 'analytics/**/*.testplane.js'
        },
        'db-migrations': {
            files: 'db-migrations/**/*.testplane.js'
        }
    },

    plugins: {
        'html-reporter-test-server': {
            enabled: !isRunningGuiTests && !isRunningAnalyticsTests,
            port: serverPort
        },
        'html-reporter-tester': {
            enabled: true,
            path: `reports/${projectUnderTest}`,
            diffMode: '3-up',
            yandexMetrika: {
                enabled: false
            },
        }
    }
});

if (isRunningAnalyticsTests) {
    _.unset(config.plugins, ['html-reporter-tester', 'yandexMetrika']);
}

if (!isRunningGuiTests && !isRunningAnalyticsTests) {
    _.set(config.plugins, ['hermione-global-hook', 'beforeEach'], async function({browser}) {
        if (/new ui/i.test(browser.executionContext.ctx.currentTest.titlePath().join(' '))) {
            await browser.url(this.browser.options.baseUrl + 'new-ui.html');
        } else {
            await browser.url(this.browser.options.baseUrl);
        }

        await browser.execute(() => {
            window.localStorage.clear();
        });

        await browser.execute(() => {
            document.querySelectorAll('.section').forEach((section) => {
                const title = section.querySelector('.section__title').innerText;
                section.setAttribute('title', title);
            });
        });
    });
}

module.exports = config;
