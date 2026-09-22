'use strict';

const _ = require('lodash');
const {getFixturesConfig} = require('../fixtures.testplane.conf');

module.exports = _.merge(getFixturesConfig(__dirname), {
    retry: 4,
    browsers: {
        chrome: {
            desiredCapabilities: {
                'goog:chromeOptions': {
                    binary: process.env.DEMO_CHROME_BINARY || '/usr/bin/chromium'
                }
            }
        }
    },
    timeTravel: 'on',
    plugins: {
        'html-reporter-tester': {
            generateBadges: () => []
        }
    }
});
