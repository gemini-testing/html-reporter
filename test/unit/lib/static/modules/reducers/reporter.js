'use strict';

import actionNames from 'lib/static/modules/action-names';
import defaultState from 'lib/static/modules/default-state';
import {appendQuery, encodeBrowsers} from 'lib/static/modules/query-params';
import viewModes from 'lib/constants/view-modes';
import StaticTestsTreeBuilder from 'lib/tests-tree-builder/static';
import {mkStorage} from '../../../../utils';

const {assign} = require('lodash');
const proxyquire = require('proxyquire');

const localStorageWrapper = {};

describe('lib/static/modules/reducers/reporter', () => {
    const sandbox = sinon.sandbox.create();
    let reducer, baseUrl;

    const mkReducer_ = () => {
        return proxyquire('lib/static/modules/reducers/reporter', {
            './helpers/local-storage-wrapper': localStorageWrapper
        }).default;
    };

    beforeEach(() => {
        localStorageWrapper.setItem = sinon.stub();
        localStorageWrapper.getItem = sinon.stub();

        sandbox.stub(StaticTestsTreeBuilder, 'create')
            .returns(Object.create(StaticTestsTreeBuilder.prototype));

        sandbox.stub(StaticTestsTreeBuilder.prototype, 'build').returns({});

        baseUrl = 'http://localhost/';
        global.window = {
            location: {
                href: new URL(baseUrl)
            },
            localStorage: mkStorage()
        };

        reducer = mkReducer_();
    });

    afterEach(() => {
        global.window = undefined;
        sandbox.restore();
    });

    describe('regression', () => {
        it('shouldn\'t change "Expand" filter when "Show all" or "Show only failed" state changing', function() {
            let newState = [
                {type: actionNames.VIEW_EXPAND_RETRIES},
                {type: actionNames.VIEW_SHOW_ALL}
            ].reduce(reducer, defaultState);

            assert.equal(newState.view.expand, 'retries');

            newState = [
                {type: actionNames.VIEW_EXPAND_RETRIES},
                {type: actionNames.VIEW_SHOW_FAILED}
            ].reduce(reducer, defaultState);

            assert.equal(newState.view.expand, 'retries');
        });
    });

    describe('VIEW_INITIAL', () => {
        const baseUrl = 'http://localhost/';

        const _mkInitialState = (state = {}) => {
            return {
                config: {
                    errorPatterns: []
                },
                ...state
            };
        };

        describe('"errorPatterns" field in config', () => {
            it('should add "regexp" field', () => {
                const errorPatterns = [{name: 'err1', pattern: 'pattern1'}];
                const action = {
                    type: actionNames.VIEW_INITIAL,
                    payload: _mkInitialState({
                        config: {errorPatterns}
                    })
                };

                const newState = reducer(defaultState, action);

                assert.deepEqual(newState.config.errorPatterns, [{name: 'err1', pattern: 'pattern1', regexp: /pattern1/}]);
            });

            it('should not modify original object', () => {
                const origErrorPatterns = [{name: 'err1', pattern: 'pattern1'}];
                const action = {
                    type: actionNames.VIEW_INITIAL,
                    payload: _mkInitialState({
                        config: {errorPatterns: origErrorPatterns}
                    })
                };

                const newState = reducer(defaultState, action);

                assert.notExists(origErrorPatterns[0].regexp);
                assert.notDeepEqual(newState.config.errorPatterns, origErrorPatterns);
            });
        });

        describe('query params', () => {
            describe('"browser" option', () => {
                it('should set "filteredBrowsers" property to an empty array by default', () => {
                    const action = {type: actionNames.VIEW_INITIAL, payload: _mkInitialState()};

                    const newState = reducer(undefined, action);

                    assert.deepStrictEqual(newState.view.filteredBrowsers, []);
                });

                it('should set "filteredBrowsers" property to specified browsers', () => {
                    global.window.location = new URL(`${baseUrl}?browser=firefox&browser=safari`);
                    const action = {type: actionNames.VIEW_INITIAL, payload: _mkInitialState()};

                    const newState = reducer(undefined, action);

                    assert.deepStrictEqual(newState.view.filteredBrowsers, [
                        {id: 'firefox', versions: []},
                        {id: 'safari', versions: []}
                    ]);
                });

                it('should set "filteredBrowsers" property to specified browsers and versions', () => {
                    global.window.location = new URL(`${baseUrl}?browser=firefox&browser=safari:23,11.2`);
                    const action = {type: actionNames.VIEW_INITIAL, payload: _mkInitialState()};

                    const newState = reducer(undefined, action);

                    assert.deepStrictEqual(newState.view.filteredBrowsers, [
                        {id: 'firefox', versions: []},
                        {id: 'safari', versions: ['23', '11.2']}
                    ]);
                });

                it('should be able to encode and decode browser ids and versions', () => {
                    const url = appendQuery(baseUrl, {
                        browser: encodeBrowsers([{id: 'safari:some', versions: ['v:1', 'v,2']}])
                    });

                    global.window.location = new URL(url);

                    const action = {type: actionNames.VIEW_INITIAL, payload: _mkInitialState()};
                    const newState = reducer(undefined, action);

                    assert.deepStrictEqual(newState.view.filteredBrowsers, [{
                        id: 'safari:some',
                        versions: ['v:1', 'v,2']
                    }]);
                });
            });

            describe('"testNameFilter" option', () => {
                it('should set "testNameFilter" property to an empty array by default', () => {
                    const action = {type: actionNames.VIEW_INITIAL, payload: _mkInitialState()};

                    const newState = reducer(undefined, action);

                    assert.deepStrictEqual(newState.view.testNameFilter, '');
                });

                it('should set "testNameFilter" property to specified value', () => {
                    global.window.location = new URL(`${baseUrl}?testNameFilter=sometest`);

                    const action = {type: actionNames.VIEW_INITIAL, payload: _mkInitialState()};

                    const newState = reducer(undefined, action);

                    assert.deepStrictEqual(newState.view.testNameFilter, 'sometest');
                });
            });

            describe('"strictMatchFilter" option', () => {
                it('should set "strictMatchFilter" property to an empty array by default', () => {
                    const action = {type: actionNames.VIEW_INITIAL, payload: _mkInitialState()};

                    const newState = reducer(undefined, action);

                    assert.deepStrictEqual(newState.view.strictMatchFilter, false);
                });

                it('should set "strictMatchFilter" property to specified value', () => {
                    global.window.location = new URL(`${baseUrl}?strictMatchFilter=true`);

                    const action = {type: actionNames.VIEW_INITIAL, payload: _mkInitialState()};

                    const newState = reducer(undefined, action);

                    assert.deepStrictEqual(newState.view.strictMatchFilter, true);
                });
            });

            describe('"retryIndex" option', () => {
                it('should set "retryIndex" property to an empty array by default', () => {
                    const action = {type: actionNames.VIEW_INITIAL, payload: _mkInitialState()};

                    const newState = reducer(undefined, action);

                    assert(!('retryIndex' in newState.view));
                });

                it('should set "retryIndex" property to string when not a number specified', () => {
                    global.window.location = new URL(`${baseUrl}?retryIndex=1abc`);

                    const action = {type: actionNames.VIEW_INITIAL, payload: _mkInitialState()};

                    const newState = reducer(undefined, action);

                    assert.deepStrictEqual(newState.view.retryIndex, '1abc');
                });

                it('should set "retryIndex" property to specified number', () => {
                    global.window.location = new URL(`${baseUrl}?retryIndex=10`);

                    const action = {type: actionNames.VIEW_INITIAL, payload: _mkInitialState()};

                    const newState = reducer(undefined, action);

                    assert.deepStrictEqual(newState.view.retryIndex, 10);
                });
            });

            describe('"viewMode" option', () => {
                it('should set "viewMode" to "all" by default', () => {
                    const action = {type: actionNames.VIEW_INITIAL, payload: _mkInitialState()};

                    const newState = reducer(undefined, action);

                    assert.deepStrictEqual(newState.view.viewMode, viewModes.ALL);
                });

                it('should set "viewMode" property to specified value', () => {
                    global.window.location = new URL(`${baseUrl}?viewMode=failed`);

                    const action = {type: actionNames.VIEW_INITIAL, payload: _mkInitialState()};

                    const newState = reducer(undefined, action);

                    assert.deepStrictEqual(newState.view.viewMode, viewModes.FAILED);
                });
            });

            describe('"expand" option', () => {
                it('should set "expand" to "errors" by default', () => {
                    const action = {type: actionNames.VIEW_INITIAL, payload: _mkInitialState()};

                    const newState = reducer(undefined, action);

                    assert.deepStrictEqual(newState.view.expand, 'errors');
                });

                it('should set "expand" property to specified value', () => {
                    global.window.location = new URL(`${baseUrl}?expand=all`);

                    const action = {type: actionNames.VIEW_INITIAL, payload: _mkInitialState()};

                    const newState = reducer(undefined, action);

                    assert.deepStrictEqual(newState.view.expand, 'all');
                });
            });

            describe('"groupByError" option', () => {
                it('should set "groupByError" to false by default', () => {
                    const action = {type: actionNames.VIEW_INITIAL, payload: _mkInitialState()};

                    const newState = reducer(undefined, action);

                    assert.deepStrictEqual(newState.view.groupByError, false);
                });

                it('should set "groupByError" property to specified value', () => {
                    global.window.location = new URL(`${baseUrl}?groupByError=true`);

                    const action = {type: actionNames.VIEW_INITIAL, payload: _mkInitialState()};

                    const newState = reducer(undefined, action);

                    assert.deepStrictEqual(newState.view.groupByError, true);
                });
            });
        });
    });

    describe('VIEW_SHOW_ALL', () => {
        it('should change "viewMode" field on "all" value', () => {
            const action = {type: actionNames.VIEW_SHOW_ALL};

            const newState = reducer(defaultState, action);

            assert.equal(newState.view.viewMode, viewModes.ALL);
        });
    });

    describe('VIEW_SHOW_FAILED', () => {
        it('should change "viewMode" field on "failed" value', () => {
            const action = {type: actionNames.VIEW_SHOW_FAILED};

            const newState = reducer(defaultState, action);

            assert.equal(newState.view.viewMode, viewModes.FAILED);
        });
    });

    describe('PROCESS_BEGIN', () => {
        it('should set processing flag', () => {
            const action = {type: actionNames.PROCESS_BEGIN};

            const newState = reducer(defaultState, action);

            assert.isTrue(newState.processing);
        });
    });

    describe('PROCESS_END', () => {
        it('should reset processing flag', () => {
            const action = {type: actionNames.PROCESS_END};

            const newState = reducer(assign(defaultState, {processing: true}), action);

            assert.isFalse(newState.processing);
        });
    });

    describe(`${actionNames.FETCH_DB}`, () => {
        it('should build correct tree', () => {
            const suitesFromDb = ['rows-with-suites'];
            const suitesTree = [{suitePath: ['some-path']}];

            StaticTestsTreeBuilder.prototype.build
                .withArgs(suitesFromDb)
                .returns({tree: {suites: suitesTree}, stats: {}});

            const db = {
                exec: sinon.stub().onFirstCall().returns([{values: suitesFromDb}])
            };
            const action = {
                type: actionNames.FETCH_DB,
                payload: {
                    db,
                    fetchDbDetails: [{url: 'stub'}]
                }
            };

            const newState = reducer(defaultState, action);

            assert.deepEqual(newState.suites, suitesTree);
        });
    });

    describe('storing state in browser storage', () => {
        it('should be done for actions that start with VIEW prefix', () => {
            const action = {type: 'VIEW_FOO_ACTION'};

            reducer(defaultState, action);

            assert.calledOnce(localStorageWrapper.setItem);
        });

        it('should be skipped for all actions that do not start with VIEW prefix', () => {
            const action = {type: 'BAR_ACTION'};

            reducer(defaultState, action);

            assert.notCalled(localStorageWrapper.setItem);
        });

        it('should include all view params of state except for inputs', () => {
            const action = {type: 'VIEW_FOO_ACTION'};

            reducer(defaultState, action);

            assert.calledOnceWith(localStorageWrapper.setItem, 'view', {
                expand: 'errors',
                groupByError: false,
                scaleImages: false,
                showOnlyDiff: false,
                showSkipped: false,
                strictMatchFilter: false,
                viewMode: viewModes.ALL
            });
        });
    });
});
