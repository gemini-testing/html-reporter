'use strict';

const utils = require('lib/gui/tool-runner-factory/utils');
const {mkSuite, mkState, mkBrowserResult} = require('../../../utils');

describe('lib/gui/tool-runner-factory/utils', () => {
    describe('formatTests', () => {
        it('should format suite with children and browsers', () => {
            const suite = mkSuite({
                suitePath: ['suite1'],
                children: [
                    mkSuite({
                        suitePath: ['suite1', 'suite2'],
                        children: [
                            mkState({
                                suitePath: ['suite1', 'suite2', 'state'],
                                browsers: [mkBrowserResult({name: 'chrome'})]
                            })
                        ],
                        browsers: [mkBrowserResult({name: 'yabro'})]
                    })
                ]
            });

            const formattedTests = utils.formatTests(suite);

            assert.deepEqual(formattedTests, [
                {
                    'browserId': 'yabro',
                    'state': {
                        'name': 'suite2'
                    },
                    'suite': {
                        'path': [
                            'suite1'
                        ]
                    }
                },
                {
                    'browserId': 'chrome',
                    'state': {
                        'name': 'state'
                    },
                    'suite': {
                        'path': [
                            'suite1',
                            'suite2'
                        ]
                    }
                }
            ]);
        });
    });
});
