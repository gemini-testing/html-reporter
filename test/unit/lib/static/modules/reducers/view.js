const reducer = require('lib/static/modules/reducers/view').default;
const actionNames = require('lib/static/modules/action-names').default;
const defaultState = require('lib/static/modules/default-state').default;
const {appendQuery, encodeBrowsers} = require('lib/static/modules/query-params');
const {ViewMode} = require('lib/constants/view-modes');
const {EXPAND_ALL, EXPAND_ERRORS} = require('lib/constants/expand-modes');
const {mkStorage} = require('../../../../utils');

describe('lib/static/modules/reducers/view', () => {
    let baseUrl;
    let originalWindow;

    beforeEach(() => {
        baseUrl = 'http://localhost/';
        originalWindow = global.window;
        global.window = {
            location: {
                href: new URL(baseUrl)
            },
            localStorage: mkStorage()
        };
    });

    afterEach(() => {
        global.window = originalWindow;
    });

    [actionNames.INIT_GUI_REPORT, actionNames.INIT_STATIC_REPORT].forEach((type) => {
        describe(`"${type}" action`, () => {
            const baseUrl = 'http://localhost/';

            const _mkInitialState = (state = {}) => {
                return {
                    config: {
                        errorPatterns: []
                    },
                    ...state
                };
            };

            describe('query params', () => {
                describe('"browser" option', () => {
                    it('should set "filteredBrowsers" property to an empty array by default', () => {
                        const action = {type, payload: _mkInitialState()};

                        const newState = reducer(defaultState, action);

                        assert.deepStrictEqual(newState.view.filteredBrowsers, []);
                    });

                    it('should set "filteredBrowsers" property to specified browsers', () => {
                        global.window.location = new URL(`${baseUrl}?browser=firefox&browser=safari`);
                        const action = {type, payload: _mkInitialState()};

                        const newState = reducer(defaultState, action);

                        assert.deepStrictEqual(newState.view.filteredBrowsers, [
                            {id: 'firefox', versions: []},
                            {id: 'safari', versions: []}
                        ]);
                    });

                    it('should set "filteredBrowsers" property to specified browsers and versions', () => {
                        global.window.location = new URL(`${baseUrl}?browser=firefox&browser=safari:23,11.2`);
                        const action = {type, payload: _mkInitialState()};

                        const newState = reducer(defaultState, action);

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

                        const action = {type, payload: _mkInitialState()};
                        const newState = reducer(defaultState, action);

                        assert.deepStrictEqual(newState.view.filteredBrowsers, [{
                            id: 'safari:some',
                            versions: ['v:1', 'v,2']
                        }]);
                    });
                });

                describe('"testNameFilter" option', () => {
                    it('should set "testNameFilter" property to an empty array by default', () => {
                        const action = {type, payload: _mkInitialState()};

                        const newState = reducer(defaultState, action);

                        assert.deepStrictEqual(newState.view.testNameFilter, '');
                    });

                    it('should set "testNameFilter" property to specified value', () => {
                        global.window.location = new URL(`${baseUrl}?testNameFilter=sometest`);

                        const action = {type, payload: _mkInitialState()};

                        const newState = reducer(defaultState, action);

                        assert.deepStrictEqual(newState.view.testNameFilter, 'sometest');
                    });
                });

                describe('"strictMatchFilter" option', () => {
                    it('should set "strictMatchFilter" property to an empty array by default', () => {
                        const action = {type, payload: _mkInitialState()};

                        const newState = reducer(defaultState, action);

                        assert.deepStrictEqual(newState.view.strictMatchFilter, false);
                    });

                    it('should set "strictMatchFilter" property to specified value', () => {
                        global.window.location = new URL(`${baseUrl}?strictMatchFilter=true`);

                        const action = {type, payload: _mkInitialState()};

                        const newState = reducer(defaultState, action);

                        assert.deepStrictEqual(newState.view.strictMatchFilter, true);
                    });
                });

                describe('"retryIndex" option', () => {
                    it('should set "retryIndex" property to an empty array by default', () => {
                        const action = {type, payload: _mkInitialState()};

                        const newState = reducer(defaultState, action);

                        assert(!('retryIndex' in newState.view));
                    });

                    it('should set "retryIndex" property to string when not a number specified', () => {
                        global.window.location = new URL(`${baseUrl}?retryIndex=1abc`);

                        const action = {type, payload: _mkInitialState()};

                        const newState = reducer(defaultState, action);

                        assert.deepStrictEqual(newState.view.retryIndex, '1abc');
                    });

                    it('should set "retryIndex" property to specified number', () => {
                        global.window.location = new URL(`${baseUrl}?retryIndex=10`);

                        const action = {type, payload: _mkInitialState()};

                        const newState = reducer(defaultState, action);

                        assert.deepStrictEqual(newState.view.retryIndex, 10);
                    });
                });

                describe('"viewMode" option', () => {
                    it('should set "viewMode" to "all" by default', () => {
                        const action = {type, payload: _mkInitialState()};

                        const newState = reducer(defaultState, action);

                        assert.deepStrictEqual(newState.view.viewMode, ViewMode.ALL);
                    });

                    it('should set "viewMode" property to "passed" value', () => {
                        global.window.location = new URL(`${baseUrl}?viewMode=passed`);

                        const action = {type, payload: _mkInitialState()};

                        const newState = reducer(defaultState, action);

                        assert.deepStrictEqual(newState.view.viewMode, ViewMode.PASSED);
                    });

                    it('should set "viewMode" property to "failed" value', () => {
                        global.window.location = new URL(`${baseUrl}?viewMode=failed`);

                        const action = {type, payload: _mkInitialState()};

                        const newState = reducer(defaultState, action);

                        assert.deepStrictEqual(newState.view.viewMode, ViewMode.FAILED);
                    });

                    it('should set "viewMode" property to "retried" value', () => {
                        global.window.location = new URL(`${baseUrl}?viewMode=retried`);

                        const action = {type, payload: _mkInitialState()};

                        const newState = reducer(defaultState, action);

                        assert.deepStrictEqual(newState.view.viewMode, ViewMode.RETRIED);
                    });

                    it('should set "viewMode" property to "skipped" value', () => {
                        global.window.location = new URL(`${baseUrl}?viewMode=skipped`);

                        const action = {type, payload: _mkInitialState()};

                        const newState = reducer(defaultState, action);

                        assert.deepStrictEqual(newState.view.viewMode, ViewMode.SKIPPED);
                    });
                });

                describe('"expand" option', () => {
                    it('should set "expand" to "errors" by default', () => {
                        const action = {type, payload: _mkInitialState()};

                        const newState = reducer(defaultState, action);

                        assert.deepStrictEqual(newState.view.expand, EXPAND_ERRORS);
                    });

                    it('should set "expand" property to specified value', () => {
                        global.window.location = new URL(`${baseUrl}?expand=all`);
                        const action = {type, payload: _mkInitialState()};

                        const newState = reducer(defaultState, action);

                        assert.deepStrictEqual(newState.view.expand, EXPAND_ALL);
                    });
                });
            });
        });
    });

    describe(`"${actionNames.CHANGE_VIEW_MODE}" action`, () => {
        Object.keys(ViewMode).forEach(((viewModeKey) => {
            it(`should change "viewMode" field to selected ${viewModeKey} value`, () => {
                const action = {type: actionNames.CHANGE_VIEW_MODE, payload: ViewMode[viewModeKey]};

                const newState = reducer(defaultState, action);

                assert.equal(newState.view.viewMode, ViewMode[viewModeKey]);
            });
        }));
    });

    describe(`"${actionNames.GROUP_TESTS_BY_KEY}" action`, () => {
        it('should set "keyToGroupTestsBy" field to passed value', () => {
            const action = {type: actionNames.GROUP_TESTS_BY_KEY, payload: 'foo.bar'};

            const newState = reducer(defaultState, action);

            assert.equal(newState.view.keyToGroupTestsBy, 'foo.bar');
        });
    });
});
