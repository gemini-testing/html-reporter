'use strict';

module.exports = {
    extends: 'gemini-testing/tests',
    env: {browser: true},
    overrides: [
        {
            files: ['tests/**/*.hermione.js', 'fixtures/**/*.hermione.js'],
            globals: {
                expect: 'readonly'
            }
        }
    ]
};
