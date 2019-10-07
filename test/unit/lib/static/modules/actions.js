'use strict';

import axios from 'axios';
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

        // sandbox.stub(actions, 'fetchDbLocations').callsFake(() => {
        //     throw Error('called fake');
        //     return ['sqlite.db'];
        // });
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
    describe('working with sqlite', () => {
        it('should fetch db locations', async () => {
            const createDbStub = sandbox.stub().resolves({db: null, url: 'test'});
            const actions = proxyquire('lib/static/modules/actions', {
                './sqlite': {
                    createDb: createDbStub,
                    mergeDbs: sinon.stub()
                }
            });

            sandbox.stub(axios, 'get').resolves({status: 404});
            sandbox.spy(actions, 'fetchDb');
            actions.fetchDb()(dispatch);

            // assert.calledOnce(actions.fetchDb);
            assert.equal(createDbStub.callCount, 1);
        });

        // const actions = rewire('lib/static/modules/actions');
        //
        // it('should fetch db locations', async () => {
        //     sandbox.stub(axios, 'get').resolves({status: 404});
        //     actions.__set__('createDatabase', () => ({db: null}));
        //     actions.__set__('fetchDbLocations', sinon.spy(actions, 'fetchDbLocations'));
        //     actions.fetchDb()(dispatch);
        //     assert.calledOnce(actions.fetchDbLocations);
        // });

        // it('should fetch databases from urls in "databaseUrls.json" if it exists', async () => {
        //     // sandbox.spy(sqliteActions, 'createDb').resolves({db: 'db', response: 200});
        //     sandbox.stub(axios, 'get').resolves({status: 200, data: {filePaths: ['test1.db', 'test2.db']}});
        //     // actions.__set__('createDatabase', (url) => ({db: 'db', response: 200, url}));
        //     actions.__set__('fetchDbLocations', sinon.spy(actions, 'fetchDbLocations'));
        //     actions.fetchDb()(dispatch);
        //     assert.calledOnce(sqliteActions, 'createDb');
        // });
        //
        // // it('should fetch db locations', async () => {
        // //     actions.__set__('createDatabase', () => ({db: null, response: 404}));
        // //     const fetchDbLocationsStub = sinon.stub(actions, 'fetchDbLocations').callsFake(() => {
        // //         return ['sqlite.db'];
        // //     });
        // //     actions.__set__('fetchDbLocations', fetchDbLocationsStub);
        // //     actions.fetchDb()(dispatch);
        // //     assert.calledOnce(actions.fetchDbLocations);
        // // });
        //
        // it('should open a database', () => {
        //     actions.__set__('createDatabase', () => ({db: null, response: 404}));
        //     const fetchDbLocationsStub = sinon.stub(actions, 'fetchDbLocations').callsFake(() => {
        //         return ['sqlite.db'];
        //     });
        //     actions.__set__('fetchDbLocations', fetchDbLocationsStub);
        //     actions.fetchDb()(dispatch);
        //     assert.calledOnce(actions.createDatabase);
        // });
    });
});
