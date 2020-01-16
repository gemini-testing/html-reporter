'use strict';
import actionNames from 'lib/static/modules/action-names';
import defaultState from 'lib/static/modules/default-state';
import {mkStorage} from '../../../../utils';

const {assign} = require('lodash');
const proxyquire = require('proxyquire');
const reducer = proxyquire('lib/static/modules/reducers/reporter', {
    './helpers/local-storage-wrapper': {
        setItem: sinon.stub(),
        getItem: sinon.stub()
    }
}).default;

describe('lib/static/modules/reducers', () => {
    describe('reporter', () => {
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

            beforeEach(() => {
                global.window = {
                    location: {
                        href: new URL(baseUrl)
                    },
                    localStorage: mkStorage()
                };
            });

            afterEach(() => {
                global.window = undefined;
            });

            it('should take error patterns from config', () => {
                const action = {
                    type: actionNames.VIEW_INITIAL,
                    payload: {
                        config: {
                            errorPatterns: [{name: 'err1', pattern: 'pattern1'}]
                        }
                    }
                };

                const newState = reducer(defaultState, action);

                assert.deepEqual(newState.config.errorPatterns, [{name: 'err1', pattern: 'pattern1'}]);
            });

            describe('query params', () => {
                describe('"browser" option', () => {
                    it('should set "filteredBrowsers" property to an empty array by default', () => {
                        const action = {type: actionNames.VIEW_INITIAL, payload: {config: {}}};

                        const newState = reducer(undefined, action);

                        assert.deepStrictEqual(newState.view.filteredBrowsers, []);
                    });

                    it('should set "filteredBrowsers" property to specified browsers', () => {
                        global.window.location = new URL(`${baseUrl}?browser=firefox&browser=safari`);
                        const action = {type: actionNames.VIEW_INITIAL, payload: {config: {}}};

                        const newState = reducer(undefined, action);

                        assert.deepStrictEqual(newState.view.filteredBrowsers, ['firefox', 'safari']);
                    });
                });

                describe('"testNameFilter" option', () => {
                    it('should set "testNameFilter" property to an empty array by default', () => {
                        const action = {type: actionNames.VIEW_INITIAL, payload: {config: {}}};

                        const newState = reducer(undefined, action);

                        assert.deepStrictEqual(newState.view.testNameFilter, '');
                    });

                    it('should set "testNameFilter" property to specified value', () => {
                        global.window.location = new URL(`${baseUrl}?testNameFilter=sometest`);

                        const action = {type: actionNames.VIEW_INITIAL, payload: {config: {}}};

                        const newState = reducer(undefined, action);

                        assert.deepStrictEqual(newState.view.testNameFilter, 'sometest');
                    });
                });

                describe('"strictMatchFilter" option', () => {
                    it('should set "strictMatchFilter" property to an empty array by default', () => {
                        const action = {type: actionNames.VIEW_INITIAL, payload: {config: {}}};

                        const newState = reducer(undefined, action);

                        assert.deepStrictEqual(newState.view.strictMatchFilter, false);
                    });

                    it('should set "strictMatchFilter" property to specified value', () => {
                        global.window.location = new URL(`${baseUrl}?strictMatchFilter=true`);

                        const action = {type: actionNames.VIEW_INITIAL, payload: {config: {}}};

                        const newState = reducer(undefined, action);

                        assert.deepStrictEqual(newState.view.strictMatchFilter, true);
                    });
                });

                describe('"retryIndex" option', () => {
                    it('should set "retryIndex" property to an empty array by default', () => {
                        const action = {type: actionNames.VIEW_INITIAL, payload: {config: {}}};

                        const newState = reducer(undefined, action);

                        assert(!('retryIndex' in newState.view));
                    });

                    it('should set "retryIndex" property to string when not a number specified', () => {
                        global.window.location = new URL(`${baseUrl}?retryIndex=1abc`);

                        const action = {type: actionNames.VIEW_INITIAL, payload: {config: {}}};

                        const newState = reducer(undefined, action);

                        assert.deepStrictEqual(newState.view.retryIndex, '1abc');
                    });

                    it('should set "retryIndex" property to specified number', () => {
                        global.window.location = new URL(`${baseUrl}?retryIndex=10`);

                        const action = {type: actionNames.VIEW_INITIAL, payload: {config: {}}};

                        const newState = reducer(undefined, action);

                        assert.deepStrictEqual(newState.view.retryIndex, 10);
                    });
                });

                describe('"viewMode" option', () => {
                    it('should set "viewMode" to "all" by default', () => {
                        const action = {type: actionNames.VIEW_INITIAL, payload: {config: {}}};

                        const newState = reducer(undefined, action);

                        assert.deepStrictEqual(newState.view.viewMode, 'all');
                    });

                    it('should set "viewMode" property to specified value', () => {
                        global.window.location = new URL(`${baseUrl}?viewMode=failed`);

                        const action = {type: actionNames.VIEW_INITIAL, payload: {config: {}}};

                        const newState = reducer(undefined, action);

                        assert.deepStrictEqual(newState.view.viewMode, 'failed');
                    });
                });

                describe('"expand" option', () => {
                    it('should set "expand" to "errors" by default', () => {
                        const action = {type: actionNames.VIEW_INITIAL, payload: {config: {}}};

                        const newState = reducer(undefined, action);

                        assert.deepStrictEqual(newState.view.expand, 'errors');
                    });

                    it('should set "expand" property to specified value', () => {
                        global.window.location = new URL(`${baseUrl}?expand=all`);

                        const action = {type: actionNames.VIEW_INITIAL, payload: {config: {}}};

                        const newState = reducer(undefined, action);

                        assert.deepStrictEqual(newState.view.expand, 'all');
                    });
                });

                describe('"groupByError" option', () => {
                    it('should set "groupByError" to false by default', () => {
                        const action = {type: actionNames.VIEW_INITIAL, payload: {config: {}}};

                        const newState = reducer(undefined, action);

                        assert.deepStrictEqual(newState.view.groupByError, false);
                    });

                    it('should set "groupByError" property to specified value', () => {
                        global.window.location = new URL(`${baseUrl}?groupByError=true`);

                        const action = {type: actionNames.VIEW_INITIAL, payload: {config: {}}};

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

                assert.equal(newState.view.viewMode, 'all');
            });
        });

        describe('VIEW_SHOW_FAILED', () => {
            it('should change "viewMode" field on "failed" value', () => {
                const action = {type: actionNames.VIEW_SHOW_FAILED};

                const newState = reducer(defaultState, action);

                assert.equal(newState.view.viewMode, 'failed');
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

        describe('parsing database results', () => {
            beforeEach(() => {
                global.window = {
                    location: {
                        href: 'http://localhost/'
                    }
                };
            });

            afterEach(() => {
                global.window = undefined;
            });

            it('should build correct tree', () => {
                const values = [
                    [
                        JSON.stringify(['test', 'smalltest1']),
                        'smalltest1',
                        'browser',
                        'url',
                        JSON.stringify({muted: false}),
                        'description',
                        JSON.stringify({message: 'error message', stack: 'error stack'}),
                        'skipReason',
                        JSON.stringify([{actualImg: {path: 'path', size: {width: 0, height: 0}}}]),
                        Number(true), // multiple tabs
                        Number(true), // screenshot
                        'fail',
                        0 // timestamp
                    ],
                    [
                        JSON.stringify(['test', 'smalltest1']),
                        'smalltest1',
                        'browser',
                        'url',
                        JSON.stringify({muted: false}),
                        'description',
                        JSON.stringify({message: 'error message', stack: 'error stack'}),
                        'skipReason',
                        JSON.stringify([{actualImg: {path: 'path', size: {width: 0, height: 0}}}]),
                        Number(true), // multiple tabs
                        Number(true), // screenshot
                        'success',
                        1 // timestamp
                    ],
                    [
                        JSON.stringify(['test', 'smalltest2']),
                        'smalltest2',
                        'browser',
                        'url',
                        JSON.stringify({muted: false}),
                        'description',
                        JSON.stringify({message: 'error message', stack: 'error stack'}),
                        'skipReason',
                        JSON.stringify([{actualImg: {path: 'path', size: {width: 0, height: 0}}}]),
                        Number(true), // multiple tabs
                        Number(true), // screenshot
                        'success',
                        0 // timestamp
                    ]
                ];
                const db = {
                    exec: function() {
                        return [{values: values}];
                    }
                };
                const action = {
                    type: actionNames.FETCH_DB,
                    payload: {
                        db: db,
                        fetchDbDetails: [
                            {
                                url: 'stub'
                            }
                        ]
                    }
                };

                const newState = reducer(defaultState, action);

                assert.match(newState.suites['test'].children[0].name, 'smalltest1');
                assert.match(newState.suites['test'].children[1].name, 'smalltest2');
                assert.match(newState.suites['test'].children[0].browsers[0].retries.length, 1);
                assert.match(newState.suites['test'].children[1].browsers[0].retries.length, 0);
            });
        });
    });
});
