'use strict';

const _ = require('lodash');

const {getFixturesConfig} = require('../fixtures.testplane.conf');

module.exports = _.merge(getFixturesConfig(__dirname, 'plugins'), {
    plugins: {
        'html-reporter-tester': {
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
});
