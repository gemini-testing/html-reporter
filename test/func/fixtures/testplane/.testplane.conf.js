'use strict';

const _ = require('lodash');

const {getFixturesConfig} = require('../fixtures.testplane.conf');

module.exports = _.merge(getFixturesConfig(__dirname, 'testplane'), {
    plugins: {
        'hermione-test-repeater': {
            enabled: true,
            repeat: 1
        },
        'html-reporter-tester': {
                enabled: true,
                path: 'report',
                diffMode: '3-up-scaled-to-fit',
                generateBadges: () => [
                    {
                        title: 'TASK-128',
                        icon: 'LogoYandexTracker'
                    },
                    {
                        title: 'master',
                        icon: 'BranchesRight'
                    },
                    null,
                    {
                        icon: 'BranchesRight'
                    }
                ]
            }
    }
});
