'use strict';

const path = require('path');

const chai = require('chai');
const _ = require('lodash');
const {getCommonConfig} = require('../../common.testplane.conf');
const {PORTS} = require('../../utils/constants');

chai.config.includeStack = true;
chai.config.truncateThreshold = 0;
global.assert = chai.assert;
process.env.TOOL = 'testplane';

const serverHost = process.env.SERVER_HOST ?? 'host.docker.internal';
const serverPort = process.env.SERVER_PORT ?? PORTS.demo.server;

const config = _.merge(getCommonConfig(__dirname), {
    retry: 4,
    baseUrl: `http://${serverHost}:${serverPort}/fixtures/testplane/report/`,
    screenshotsDir: path.resolve(__dirname, '../../tests/screens'),
    timeTravel: 'on',

    sets: {
        fixtures: {
            files: 'demo.testplane.js'
        }
    },

    plugins: {
        'html-reporter-test-server': {
            enabled: true,
            port: serverPort
        },
        'html-reporter-tester': {
            enabled: true,
            path: 'report',
            baseHost: 'https://example.com:123',
            diffMode: '3-up',
            yandexMetrika: {
                enabled: false
            },
            generateBadges: () => []
        }
    }
});

_.set(config.plugins, ['hermione-global-hook', 'beforeEach'], async function({browser}) {
    if (/new ui/i.test(browser.executionContext.ctx.currentTest.titlePath().join(' '))) {
        await browser.url(this.browser.options.baseUrl + 'new-ui.html');
    } else {
        await browser.url(this.browser.options.baseUrl);
    }

    await browser.execute(() => {
        window.localStorage.clear();
        document.querySelectorAll('.section').forEach((section) => {
            const title = section.querySelector('.section__title').innerText;
            section.setAttribute('title', title);
        });
    });
});

if (process.env.DEMO_CHROME_BINARY) {
    config.browsers.chrome.desiredCapabilities['goog:chromeOptions'].binary = process.env.DEMO_CHROME_BINARY;
}

module.exports = config;
