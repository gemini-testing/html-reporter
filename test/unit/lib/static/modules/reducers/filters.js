const reducer = require('lib/static/modules/reducers/filters').default;
const actionNames = require('lib/static/modules/action-names').default;
const defaultState = require('lib/static/modules/default-state').default;
const {appendQuery, encodeBrowsers} = require('lib/static/modules/query-params');
const {ViewMode} = require('lib/constants/view-modes');
const {mkStorage} = require('../../../../utils');
const {Page, PathNames} = require('@/constants');

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

    [
        {
            page: Page.suitesPage,
            hash: `#${PathNames.suites}`
        },
        {
            page: Page.visualChecksPage,
            hash: `#${PathNames.visualChecks}`
        }
    ].forEach(({page, hash}) => {
        [actionNames.INIT_GUI_REPORT, actionNames.INIT_STATIC_REPORT].forEach((type) => {
            describe(`"${type}" action for page: ${page}`, () => {
                const baseUrl = 'http://localhost/';

                const _mkInitialState = (state = {}) => {
                    return {
                        config: {
                            errorPatterns: []
                        },
                        ...state
                    };
                };

                describe(`query params for page: ${page}`, () => {
                    describe('"browser" option', () => {
                        it('should set "filteredBrowsers" property to an empty array by default', () => {
                            const action = {type, payload: _mkInitialState()};

                            const newState = reducer(defaultState, action);

                            assert.deepStrictEqual(newState.app[page].filteredBrowsers, []);
                        });

                        it('should set "filteredBrowsers" property to specified browsers with expanded versions', () => {
                            global.window.location = new URL(`${baseUrl}?browser=firefox&browser=safari${hash}`);
                            const state = {
                                ...defaultState,
                                browsers: [
                                    {id: 'firefox', versions: ['v1', 'v2']},
                                    {id: 'safari', versions: ['v3']}
                                ]
                            };
                            const action = {type, payload: _mkInitialState()};

                            const newState = reducer(state, action);

                            assert.deepStrictEqual(newState.app[page].filteredBrowsers, [
                                {id: 'firefox', versions: ['v1', 'v2']},
                                {id: 'safari', versions: ['v3']}
                            ]);
                        });

                        it('should keep empty versions for browsers not found in available browsers', () => {
                            global.window.location = new URL(`${baseUrl}?browser=firefox&browser=safari${hash}`);
                            const state = {
                                ...defaultState,
                                browsers: [
                                    {id: 'firefox', versions: ['v1', 'v2']}
                                ]
                            };
                            const action = {type, payload: _mkInitialState()};

                            const newState = reducer(state, action);

                            assert.deepStrictEqual(newState.app[page].filteredBrowsers, [
                                {id: 'firefox', versions: ['v1', 'v2']},
                                {id: 'safari', versions: []}
                            ]);
                        });

                        it('should set "filteredBrowsers" property to specified browsers and versions without expansion', () => {
                            global.window.location = new URL(`${baseUrl}?browser=firefox&browser=safari:23,11.2${hash}`);
                            const state = {
                                ...defaultState,
                                browsers: [
                                    {id: 'firefox', versions: ['v1', 'v2']},
                                    {id: 'safari', versions: ['23', '11.2', '10.0']}
                                ]
                            };
                            const action = {type, payload: _mkInitialState()};

                            const newState = reducer(state, action);

                            assert.deepStrictEqual(newState.app[page].filteredBrowsers, [
                                {id: 'firefox', versions: ['v1', 'v2']},
                                {id: 'safari', versions: ['23', '11.2']}
                            ]);
                        });

                        it('should expand versions only for browsers without explicit versions', () => {
                            global.window.location = new URL(`${baseUrl}?browser=chrome-phone&browser=safari:23${hash}`);
                            const state = {
                                ...defaultState,
                                browsers: [
                                    {id: 'chrome-phone', versions: ['phone-124.0', 'phone-101.0']},
                                    {id: 'safari', versions: ['23', '11.2']}
                                ]
                            };
                            const action = {type, payload: _mkInitialState()};

                            const newState = reducer(state, action);

                            assert.deepStrictEqual(newState.app[page].filteredBrowsers, [
                                {id: 'chrome-phone', versions: ['phone-124.0', 'phone-101.0']},
                                {id: 'safari', versions: ['23']}
                            ]);
                        });

                        it('should be able to encode and decode browser ids and versions', () => {
                            const url = appendQuery(baseUrl, {
                                browser: encodeBrowsers([{id: 'safari:some', versions: ['v:1', 'v,2']}])
                            });

                            global.window.location = new URL(url + hash);

                            const action = {type, payload: _mkInitialState()};
                            const newState = reducer(defaultState, action);

                            assert.deepStrictEqual(newState.app[page].filteredBrowsers, [{
                                id: 'safari:some',
                                versions: ['v:1', 'v,2']
                            }]);
                        });
                    });

                    describe('"testNameFilter" option', () => {
                        it('should set "testNameFilter" property to an empty array by default', () => {
                            const action = {type, payload: _mkInitialState()};

                            const newState = reducer(defaultState, action);

                            assert.deepStrictEqual(newState.app[page].nameFilter, '');
                        });

                        it('should set "testNameFilter" property to specified value', () => {
                            global.window.location = new URL(`${baseUrl}?testNameFilter=sometest${hash}`);

                            const action = {type, payload: _mkInitialState()};

                            const newState = reducer(defaultState, action);

                            assert.deepStrictEqual(newState.app[page].nameFilter, 'sometest');
                        });
                    });

                    describe(`"viewMode" option for page: ${page}`, () => {
                        it('should set "viewMode" to "all" by default', () => {
                            const action = {type, payload: _mkInitialState()};

                            const newState = reducer(defaultState, action);

                            assert.deepStrictEqual(newState.app[page].viewMode, ViewMode.ALL);
                        });

                        it('should set "viewMode" property to "passed" value', () => {
                            global.window.location = new URL(`${baseUrl}?viewMode=passed${hash}`);

                            const action = {type, payload: _mkInitialState()};

                            const newState = reducer(defaultState, action);

                            assert.deepStrictEqual(newState.app[page].viewMode, ViewMode.PASSED);
                        });

                        it('should set "viewMode" property to "failed" value', () => {
                            global.window.location = new URL(`${baseUrl}?viewMode=failed${hash}`);

                            const action = {type, payload: _mkInitialState()};

                            const newState = reducer(defaultState, action);

                            assert.deepStrictEqual(newState.app[page].viewMode, ViewMode.FAILED);
                        });

                        it('should set "viewMode" property to "retried" value', () => {
                            global.window.location = new URL(`${baseUrl}?viewMode=retried${hash}`);

                            const action = {type, payload: _mkInitialState()};

                            const newState = reducer(defaultState, action);

                            assert.deepStrictEqual(newState.app[page].viewMode, ViewMode.RETRIED);
                        });

                        it('should set "viewMode" property to "skipped" value', () => {
                            global.window.location = new URL(`${baseUrl}?viewMode=skipped${hash}`);
                            global.window.location.hash = hash;

                            const action = {type, payload: _mkInitialState()};

                            const newState = reducer(defaultState, action);

                            assert.deepStrictEqual(newState.app[page].viewMode, ViewMode.SKIPPED);
                        });
                    });
                });
            });
        });

        describe(`"${actionNames.CHANGE_VIEW_MODE}" action`, () => {
            Object.keys(ViewMode).forEach(((viewModeKey) => {
                it(`should change "viewMode" field to selected ${viewModeKey} value on page: ${page}`, () => {
                    const action = {
                        type: actionNames.CHANGE_VIEW_MODE,
                        payload: {
                            page,
                            data: ViewMode[viewModeKey]
                        }
                    };

                    const newState = reducer(defaultState, action);

                    assert.equal(newState.app[page].viewMode, ViewMode[viewModeKey]);
                });
            }));
        });
    });
});
