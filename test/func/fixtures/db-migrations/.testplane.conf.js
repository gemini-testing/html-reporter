'use strict';

const _ = require('lodash');

const {getFixturesConfig} = require('../fixtures.testplane.conf');

module.exports = _.merge(getFixturesConfig(__dirname, 'testplane'), {
    plugins: {
        'hermione-test-repeater': {
            enabled: true,
            repeat: 1
        }
    }
});
