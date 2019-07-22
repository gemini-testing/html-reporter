'use strict';

const {
    getAllOpenedImagesInfo
} = require('lib/static/modules/find-same-diffs-utils');
const {
    mkSuite,
    mkState,
    mkBrowserResult,
    mkImagesInfo,
    mkTestResult
} = require('../../../utils');
import {FAIL} from 'lib/constants/test-statuses';

describe('lib/static/modules/find-same-diffs-utils', () => {
    describe('getAllOpenedImagesInfo', () => {
        it('should get images info from suite with children and browsers', () => {
            const mkBrowserResultWithImagesInfo = name => {
                return mkBrowserResult({
                    name,
                    result: mkTestResult({
                        name,
                        imagesInfo: [
                            mkImagesInfo({
                                opened: true
                            })
                        ]
                    }),
                    state: {
                        opened: true,
                        retryIndex: 0
                    }
                });
            };

            const failed = [
                mkSuite({
                    suitePath: ['suite1'],
                    children: [
                        mkSuite({
                            suitePath: ['suite1', 'suite2'],
                            children: [
                                mkState({
                                    suitePath: ['suite1', 'suite2', 'state'],
                                    status: FAIL,
                                    browsers: [mkBrowserResultWithImagesInfo('chrome')]
                                })
                            ],
                            browsers: [mkBrowserResultWithImagesInfo('yabro')]
                        })
                    ]
                })
            ];

            const imagesInfo = getAllOpenedImagesInfo(failed);

            assert.lengthOf(imagesInfo, 2);
            assert.deepEqual(imagesInfo[0].browserId, 'yabro');
            assert.deepEqual(imagesInfo[1].browserId, 'chrome');
        });
    });
});
