'use strict';

const _ = require('lodash');

const {getFixturesConfig} = require('../fixtures.testplane.conf');

module.exports = _.merge(getFixturesConfig(__dirname), {
    plugins: {
        'html-reporter-tester': {
            baseHost: 'https://example.com:123',
            yandexMetrika: {
                enabled: false
            }
        }
    }
});
