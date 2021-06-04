'use strict';

global.assert = require('chai').assert;

const serverPort = 8080;
const fixturesPath = 'test/func/fixtures/report';

module.exports = {
    baseUrl: `http://localhost:${serverPort}/test/func/fixtures/index.html`,

    screenshotsDir: 'test/func/fixtures/screens',

    sets: {
        fixtures: {
            files: 'test/func/fixtures/**/*.hermione.js'
        }
    },

    browsers: {
        chrome: {
            windowSize: '1280x1024',
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
            path: fixturesPath,
            pluginsEnabled: false,
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
        'hermione-headless-chrome': {
            browserId: 'chrome',
            version: '77'
        }
    }
};
