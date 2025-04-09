const proxyquire = require('proxyquire');
const {defaults} = require('lodash');
const actionNames = require('lib/static/modules/action-names').default;
const defaultState = require('lib/static/modules/default-state').default;
const {ViewMode} = require('lib/constants/view-modes');
const {SECTIONS, ERROR_KEY, KEY_DELIMITER} = require('lib/constants/group-tests');
const {mkStateTree, mkStateView} = require('../../../state-utils');

describe('lib/static/modules/reducers/grouped-tests', () => {
    const sandbox = sinon.sandbox.create();
    let reducer, groupResult, groupMeta;

    beforeEach(() => {
        groupResult = sandbox.stub().named('groupResult').returns(undefined);
        groupMeta = sandbox.stub().named('groupMeta').returns(undefined);

        reducer = proxyquire('lib/static/modules/reducers/grouped-tests', {
            './by/result': {groupResult},
            './by/meta': {groupMeta},
            'immer': {produce: sandbox.stub().callsFake(cb => cb)}
        }).default;
    });

    afterEach(() => sandbox.restore());

    const mkViewArgs_ = (opts = {}) => {
        return defaults(opts, {
            viewMode: ViewMode.ALL,
            testNameFilter: '',
            useMatchCaseFilter: false,
            useRegexFilter: false,
            strictMatchFilter: false,
            filteredBrowsers: []
        });
    };

    [
        actionNames.INIT_GUI_REPORT,
        actionNames.INIT_STATIC_REPORT,
        actionNames.GROUP_TESTS_BY_KEY,
        actionNames.TESTS_END,
        actionNames.BROWSERS_SELECTED,
        actionNames.VIEW_UPDATE_FILTER_BY_NAME,
        actionNames.VIEW_SET_STRICT_MATCH_FILTER,
        actionNames.CHANGE_VIEW_MODE,
        actionNames.COMMIT_ACCEPTED_IMAGES_TO_TREE,
        actionNames.COMMIT_REVERTED_IMAGES_TO_TREE
    ].forEach((actionName) => {
        describe(`${actionName} action`, () => {
            it('should calc only available meta keys if tests are not grouped', () => {
                const viewArgs = mkViewArgs_();
                const state = {
                    ...defaultState,
                    tree: mkStateTree(),
                    view: mkStateView({keyToGroupTestsBy: '', ...viewArgs})
                };

                reducer(state, {type: actionName});

                assert.calledOnceWith(groupMeta, {tree: state.tree, group: state.groupedTests.meta, diff: {}, ...viewArgs});
                assert.notCalled(groupResult);
            });

            it(`should group only selected "${SECTIONS.RESULT}" group with "${ERROR_KEY}" key`, () => {
                const viewArgs = mkViewArgs_();
                const keyToGroupTestsBy = `${SECTIONS.RESULT}${KEY_DELIMITER}${ERROR_KEY}`;
                const state = {
                    ...defaultState,
                    tree: mkStateTree(),
                    view: mkStateView({keyToGroupTestsBy, ...viewArgs}),
                    config: {errorPatterns: ['some-pattern']}
                };

                reducer(state, {type: actionName});

                assert.calledOnceWith(groupResult, {
                    tree: state.tree,
                    group: state.groupedTests[SECTIONS.RESULT],
                    diff: {},
                    groupKey: ERROR_KEY,
                    errorPatterns: state.config.errorPatterns,
                    ...viewArgs
                });
                assert.notCalled(groupMeta);
            });

            it(`should group only selected "${SECTIONS.META}" group with "foo_bar" key`, () => {
                const viewArgs = mkViewArgs_();
                const groupKey = 'foo_bar';
                const keyToGroupTestsBy = `${SECTIONS.META}${KEY_DELIMITER}${groupKey}`;
                const state = {
                    ...defaultState,
                    tree: mkStateTree(),
                    view: mkStateView({keyToGroupTestsBy, ...viewArgs})
                };

                reducer(state, {type: actionName});

                assert.calledOnceWith(groupMeta, {
                    tree: state.tree,
                    group: state.groupedTests[SECTIONS.META],
                    groupKey,
                    diff: {},
                    ...viewArgs
                });
                assert.notCalled(groupResult);
            });
        });
    });
});
