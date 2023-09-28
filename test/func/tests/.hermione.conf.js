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

const commonConfig = getCommonConfig(__dirname);

const config = _.merge(commonConfig, {
    baseUrl: `http://${serverHost}:${serverPort}/fixtures/${projectUnderTest}/report/index.html`,

    browsers: {
        // TODO: this is a hack to be able to have 2 sets of screenshots, for hermione-based report and pwt-based report
        //       currently, those have weird tiny diffs. Would be nice to figure out the cause and have common screenshots.
        'chrome-pwt': {...commonConfig.browsers.chrome}
    },

    sets: {
        common: {
            files: 'common/**/*.hermione.js'
        },
        'common-gui': {
            browsers: ['chrome'],
            files: 'common-gui/**/*.hermione.js'
        },
        eye: {
            browsers: ['chrome'],
            files: 'eye/**/*.hermione.js',
        },
        plugins: {
            browsers: ['chrome'],
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
