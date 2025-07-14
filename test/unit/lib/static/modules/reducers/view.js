const reducer = require('lib/static/modules/reducers/view').default;
const actionNames = require('lib/static/modules/action-names').default;
const defaultState = require('lib/static/modules/default-state').default;
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

    describe(`"${actionNames.GROUP_TESTS_BY_KEY}" action`, () => {
        it('should set "keyToGroupTestsBy" field to passed value', () => {
            const action = {type: actionNames.GROUP_TESTS_BY_KEY, payload: 'foo.bar'};

            const newState = reducer(defaultState, action);

            assert.equal(newState.view.keyToGroupTestsBy, 'foo.bar');
        });
    });
});
