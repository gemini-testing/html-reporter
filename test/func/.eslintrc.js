'use strict';

module.exports = {
    extends: 'gemini-testing/tests',
    env: {browser: true},
    overrides: [
        {
            files: ['tests/**/*.testplane.js', 'fixtures/**/*.testplane.js'],
            globals: {
                expect: 'readonly'
            }
        }
    ]
};
