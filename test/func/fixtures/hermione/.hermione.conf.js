'use strict';

const {getFixturesConfig} = require('../fixtures.hermione.conf');

module.exports = _.merge(getFixturesConfig(__dirname), {
    plugins: {
        'hermione-test-repeater': {
            enabled: true,
            repeat: 1,
        },
    }
});
