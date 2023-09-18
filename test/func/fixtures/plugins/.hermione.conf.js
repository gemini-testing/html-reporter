'use strict';

const path = require('path');

const {GRID_URL, CHROME_BINARY_PATH} = require('../../utils/constants');
global.assert = require('chai').assert;

const serverHost = process.env.SERVER_HOST ?? 'host.docker.internal';
const serverPort = process.env.SERVER_PORT ?? 8082;
const fixturesPath = 'report';

module.exports = {
    gridUrl: GRID_URL,
    baseUrl: `http://${serverHost}:${serverPort}/fixtures/plugins/index.html`,

    screenshotsDir: path.resolve(__dirname, 'screens'),

    sets: {
        fixtures: {
            files: '**/*.hermione.js'
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
            path: fixturesPath,
            pluginsEnabled: true,
            plugins: [
                {
                    name: 'html-reporter-basic-plugin',
                    component: 'ColorBorder',
                    point: 'result',
                    position: 'wrap'
                },
                {
                    name: 'html-reporter-basic-plugin',
                    component: 'ColorBorder',
                    point: 'result',
                    position: 'before'
                },
                { // this plugin does not exist and should be ignored
                    name: 'html-reporter-unexisting-plugin',
                    component: 'ColorBorder',
                    point: 'result',
                    position: 'before'
                },
                { // this plugin component does not exist and should be ignored
                    name: 'html-reporter-basic-plugin',
                    component: 'UnexistingBorder',
                    point: 'result',
                    position: 'before'
                },
                { // this plugin point does not exist and should be ignored
                    name: 'html-reporter-basic-plugin',
                    component: 'ColorBorder',
                    point: 'unexisting',
                    position: 'before'
                },
                {
                    name: 'html-reporter-basic-plugin',
                    component: 'ColorBorder',
                    point: 'result',
                    position: 'after'
                },
                {
                    name: 'html-reporter-redux-with-server-plugin',
                    component: 'ColorBorder',
                    point: 'result',
                    position: 'after'
                },
                {
                    name: 'html-reporter-redux-plugin',
                    component: 'ColorBorder',
                    position: 'before'
                },
                {
                    name: 'html-reporter-menu-bar-plugin',
                    component: 'MenuBarItem',
                    position: 'after',
                    point: 'menu-bar'
                }
            ]
        },
    }
};
