'use strict';

import axios from 'axios';
import {isArray} from 'lodash';
import proxyquire from 'proxyquire';

import {
    acceptOpened,
    retryTest,
    runFailedTests
} from 'lib/static/modules/actions';
import actionNames from 'lib/static/modules/action-names';
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
    let actions;
    let addNotification;

    beforeEach(() => {
        dispatch = sinon.stub();
        sandbox.stub(axios, 'post').resolves({data: {}});
        addNotification = sinon.stub();

        actions = proxyquire('lib/static/modules/actions', {
            'reapop': {addNotification}
        });
    });

    afterEach(() => sandbox.restore());

    describe('initial', () => {
        it('should run init action on server', async () => {
            sandbox.stub(axios, 'get').resolves({data: {}});

            await actions.initial()(dispatch);

            assert.calledOnceWith(axios.get, '/init');
        });

        it('should dispatch "VIEW_INITIAL" action', async () => {
            sandbox.stub(axios, 'get').resolves({data: 'some-data'});

            await actions.initial()(dispatch);

            assert.calledOnceWith(dispatch, {type: actionNames.VIEW_INITIAL, payload: 'some-data'});
        });

        it('should show notification if error in initialization on the server is happened', async () => {
            sandbox.stub(axios, 'get').throws(new Error('failed to initialize custom gui'));

            await actions.initial()(dispatch);

            assert.calledOnceWith(
                addNotification,
                {
                    dismissAfter: 0,
                    id: 'initial',
                    message: 'failed to initialize custom gui',
                    status: 'error'
                }
            );
        });
    });

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

    describe('runCustomGuiAction', () => {
        it('should run custom action on server for control of given group of section', async () => {
            const payload = {
                sectionName: 'foo',
                groupIndex: 100,
                controlIndex: 500
            };

            await actions.runCustomGuiAction(payload)(dispatch);

            assert.calledOnceWith(
                axios.post,
                sinon.match.any,
                sinon.match(({sectionName, groupIndex, controlIndex}) => {
                    assert.equal(sectionName, 'foo');
                    assert.equal(groupIndex, 100);
                    assert.equal(controlIndex, 500);
                    return true;
                })
            );
        });

        it('should dispatch action for control of given group of section', async () => {
            const payload = {
                sectionName: 'foo',
                groupIndex: 100,
                controlIndex: 500
            };

            await actions.runCustomGuiAction(payload)(dispatch);

            assert.calledOnceWith(
                dispatch,
                {
                    type: actionNames.RUN_CUSTOM_GUI_ACTION,
                    payload: {
                        sectionName: 'foo',
                        groupIndex: 100,
                        controlIndex: 500
                    }
                }
            );
        });

        it('should show notification if error in action on the server is happened', async () => {
            const payload = {
                sectionName: 'foo',
                groupIndex: 100,
                controlIndex: 500
            };
            axios.post.throws(new Error('failed to run custom gui control action'));

            await actions.runCustomGuiAction(payload)(dispatch);

            assert.calledOnceWith(
                addNotification,
                {
                    dismissAfter: 0,
                    id: 'runCustomGuiAction',
                    message: 'failed to run custom gui control action',
                    status: 'error'
                }
            );
        });
    });
});
