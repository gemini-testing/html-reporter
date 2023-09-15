'use strict';

const mainHermioneConfig = require('../main/.hermione.main');

module.exports = {
    ...mainHermioneConfig,

    screenshotsDir: 'test/func/plugins/screens',

    sets: {
        plugins: {
            files: 'test/func/plugins/**/*.hermione.js'
        }
    },
};
