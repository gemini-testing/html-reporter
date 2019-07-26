'use strict';

import axios from 'axios';

import {acceptOpened, retryTest} from 'lib/static/modules/actions';
import {
    mkSuite,
    mkState,
    mkBrowserResult,
    mkImagesInfo,
    mkTestResult
} from '../../../utils';
import {FAIL} from 'lib/constants/test-statuses';

const mkBrowserResultWithImagesInfo = name => {
    return mkBrowserResult({
        name,
        status: FAIL,
        result: mkTestResult({
            name,
            status: FAIL,
            imagesInfo: [
                mkImagesInfo({
                    status: FAIL,
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

describe('lib/static/modules/actions', () => {
    const sandbox = sinon.sandbox.create();
    let dispatch;

    beforeEach(() => {
        dispatch = sinon.stub();
        sandbox.stub(axios, 'post').resolves({data: {}});
    });

    afterEach(() => sandbox.restore());

    describe('acceptOpened', () => {
        it('should update reference for suite with children and browsers', async () => {
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

            await acceptOpened(failed)(dispatch);

            assert.calledWith(
                axios.post,
                sinon.match.any,
                sinon.match(formattedFails => {
                    assert.lengthOf(formattedFails, 2);
                    assert.equal(formattedFails[0].browserId, 'yabro');
                    assert.equal(formattedFails[1].browserId, 'chrome');
                    return true;
                })
            );
        });
    });

    describe('retryTest', () => {
        const suite = mkSuite({
            suitePath: ['suite1'],
            children: [
                mkState({
                    suitePath: ['suite1', 'suite2'],
                    status: FAIL,
                    browsers: [
                        mkBrowserResultWithImagesInfo('chrome'),
                        mkBrowserResultWithImagesInfo('yabro')
                    ]
                })
            ],
            browsers: [mkBrowserResultWithImagesInfo('yabro')]
        });

        it('should run tests from suite with children and browsers', async () => {
            await retryTest(suite)(dispatch);

            assert.calledWith(
                axios.post,
                sinon.match.any,
                sinon.match(tests => {
                    assert.equal(tests.browserId, null);
                    assert.lengthOf(tests.browsers, 1);
                    assert.lengthOf(tests.children, 1);
                    assert.lengthOf(tests.children[0].browsers, 2);
                    assert.notProperty(tests.children[0], 'children');
                    return true;
                })
            );
        });

        it('should not run children if browserId defined', async () => {
            const browserId = 'yabro';

            await retryTest(suite, browserId)(dispatch);

            assert.calledWith(
                axios.post,
                sinon.match.any,
                sinon.match(tests => {
                    assert.equal(tests.browserId, 'yabro');
                    assert.notProperty(tests, 'children');
                    assert.lengthOf(tests.browsers, 1);
                    assert.equal(tests.browsers[0].name, 'yabro');
                    return true;
                })
            );
        });
    });
});
