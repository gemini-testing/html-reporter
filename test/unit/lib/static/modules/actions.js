'use strict';

import axios from 'axios';
import {isArray} from 'lodash';

import proxyquire from 'proxyquire';
import {acceptOpened, retryTest, runFailedTests} from 'lib/static/modules/actions';
import {
    mkSuiteTree,
    mkSuite,
    mkState,
    mkBrowserResult,
    mkImagesInfo,
    mkTestResult
} from '../../../utils';
import {SUCCESS, FAIL} from 'lib/constants/test-statuses';

const mkBrowserResultWithImagesInfo = (name, status = FAIL) => {
    return mkBrowserResult({
        name,
        status,
        result: mkTestResult({
            name,
            status,
            imagesInfo: [
                mkImagesInfo({
                    status,
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
            browsers: [
                mkBrowserResultWithImagesInfo('yabro', SUCCESS),
                mkBrowserResultWithImagesInfo('foo-bar', FAIL)
            ],
            children: [
                mkState({
                    suitePath: ['suite1', 'suite2'],
                    status: FAIL,
                    browsers: [
                        mkBrowserResultWithImagesInfo('chrome'),
                        mkBrowserResultWithImagesInfo('yabro')
                    ]
                })
            ]
        });

        [
            {browserId: 'yabro', status: 'successful'},
            {browserId: 'foo-bar', status: 'failed'}
        ].forEach(({browserId, status}) => {
            it(`should run only ${status} test if it was passed`, async () => {
                await retryTest(suite, browserId)(dispatch);

                assert.calledWith(
                    axios.post,
                    sinon.match.any,
                    sinon.match(tests => {
                        if (isArray(tests)) {
                            assert.equal(tests[0].browserId, browserId);
                        } else {
                            assert.equal(tests.browserId, browserId);
                        }

                        return true;
                    })
                );
            });
        });
    });

    describe('runFailedTests', () => {
        it('should run all failed tests', async () => {
            const tests = mkSuiteTree({
                browsers: [
                    {state: {opened: false}, result: {status: FAIL}},
                    {state: {opened: true}, result: {status: SUCCESS}},
                    {state: {opened: true}, result: {status: FAIL}},
                    {result: {status: FAIL}}
                ]
            });

            await runFailedTests(tests)(dispatch);

            assert.calledOnceWith(axios.post, sinon.match.any, sinon.match((formattedFails) => {
                assert.lengthOf(formattedFails, 1);
                assert.lengthOf(formattedFails[0].browsers, 3);
                return true;
            }));
        });
    });

    describe('openDbConnection', () => {
        let fetchDatabasesStub;
        let mergeDatabasesStub;
        let actions;

        beforeEach(() => {
            fetchDatabasesStub = sandbox.stub().resolves();
            mergeDatabasesStub = sandbox.stub().resolves();

            global.window = {
                location: {
                    href: 'http://localhost/random/path.html'
                }
            };

            actions = proxyquire('lib/static/modules/actions', {
                './sqlite': {
                    fetchDatabases: fetchDatabasesStub,
                    mergeDatabases: mergeDatabasesStub
                }
            });
        });

        afterEach(() => {
            sandbox.restore();

            global.window = undefined;
        });

        it('should fetch databaseUrls.json for default html page', async () => {
            global.window.location.href = 'http://127.0.0.1:8080/';

            await actions.openDbConnection()(dispatch);

            assert.calledOnceWith(fetchDatabasesStub, ['http://127.0.0.1:8080/databaseUrls.json']);
        });

        it('should fetch databaseUrls.json for custom html page', async () => {
            global.window.location.href = 'http://127.0.0.1:8080/some/path.html';

            await actions.openDbConnection()(dispatch);

            assert.calledOnceWith(fetchDatabasesStub, ['http://127.0.0.1:8080/some/databaseUrls.json']);
        });

        it('should dispatch empty payload if fetchDatabases rejected', async () => {
            fetchDatabasesStub.rejects('stub');

            await actions.openDbConnection()(dispatch);

            assert.calledOnceWith(
                dispatch,
                sinon.match({
                    payload: {db: null, fetchDbDetails: []}
                }),
            );
        });

        it('should dispatch payload.fetchDbDetails even if mergeDatabases rejected', async () => {
            fetchDatabasesStub.resolves([{url: 'stub url', status: 200, data: 'stub'}]);
            mergeDatabasesStub.rejects('stub');

            await actions.openDbConnection()(dispatch);

            assert.calledOnceWith(
                dispatch,
                sinon.match({
                    payload: {fetchDbDetails: [{url: 'stub url', status: 200, success: true}]}
                }),
            );
        });

        it('should filter null data before merge databases', async () => {
            fetchDatabasesStub.resolves([{url: 'stub url1', status: 404, data: null}, {url: 'stub url2', status: 200, data: 'stub'}]);

            await actions.openDbConnection()(dispatch);

            assert.calledOnceWith(
                mergeDatabasesStub,
                ['stub']
            );
        });
    });
});
