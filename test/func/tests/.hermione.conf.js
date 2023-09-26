'use strict';

const path = require('path');

const chai = require('chai');
const _ = require('lodash');
const {getCommonConfig} = require('../common.hermione.conf');

chai.config.includeStack = true;
chai.config.truncateThreshold = 0;
global.assert = chai.assert;

const serverHost = process.env.SERVER_HOST ?? 'host.docker.internal';
const serverPort = process.env.SERVER_PORT ?? 8083;
const projectUnderTest = process.env.PROJECT_UNDER_TEST;

const isRunningGuiTests = projectUnderTest.includes('gui');
if (!projectUnderTest) {
    throw 'Project under test was not specified';
}

const config = _.merge(getCommonConfig(__dirname), {
    baseUrl: `http://${serverHost}:${serverPort}/fixtures/${projectUnderTest}/report/index.html`,

    sets: {
        common: {
            files: 'common/**/*.hermione.js'
        },
        'common-gui': {
            files: 'common-gui/**/*.hermione.js'
        },
        eye: {
            files: 'eye/**/*.hermione.js',
        },
        plugins: {
            files: 'plugins/**/*.hermione.js'
        }
    },

    plugins: {
        'html-reporter-test-server': {
            enabled: !isRunningGuiTests,
            port: serverPort
        },
        'html-reporter-tester': {
            enabled: true,
            path: `reports/${projectUnderTest}`,
            diffMode: '3-up'
        }
    }
});

if (!isRunningGuiTests) {
    _.set(config.plugins, ['hermione-global-hook', 'beforeEach'], async function() {
        await browser.execute(() => {
            window.localStorage.clear();
        });

        await this.browser.url(this.browser.options.baseUrl);
        await this.browser.execute(() => {
            document.querySelectorAll('.section').forEach((section) => {
                const title = section.querySelector('.section__title').innerText;
                section.setAttribute('title', title);
            });
        });
    });
}

module.exports = config;
