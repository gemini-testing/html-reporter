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

const isRunningGuiTests = projectUnderTest.includes('gui');
const isRunningAnalyticsTests = projectUnderTest.includes('analytics');
if (!projectUnderTest) {
    throw 'Project under test was not specified';
}

const commonConfig = getCommonConfig(__dirname);

const config = _.merge(commonConfig, {
    retry: 4,
    baseUrl: `http://${serverHost}:${serverPort}/fixtures/${projectUnderTest}/report/index.html`,

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
            diffMode: '3-up'
        }
    }
});

if (!isRunningGuiTests && !isRunningAnalyticsTests) {
    _.set(config.plugins, ['hermione-global-hook', 'beforeEach'], async function({browser}) {
        await browser.url(this.browser.options.baseUrl);

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
