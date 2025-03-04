import actionNames from '../../action-names';
import {groupMeta} from './by/meta';
import {groupResult} from './by/result';
import {SECTIONS} from '../../../../constants/group-tests';
import {parseKeyToGroupTestsBy} from '../../utils';
import {applyStateUpdate, ensureDiffProperty} from '../../utils/state';

export default (state, action) => {
    switch (action.type) {
        case actionNames.INIT_GUI_REPORT:
        case actionNames.INIT_STATIC_REPORT:
        case actionNames.GROUP_TESTS_BY_KEY:
        case actionNames.TESTS_END:
        case actionNames.BROWSERS_SELECTED:
        case actionNames.VIEW_UPDATE_FILTER_BY_NAME:
        case actionNames.VIEW_SET_FILTER_MATCH_CASE:
        case actionNames.VIEW_SET_FILTER_USE_REGEX:
        case actionNames.VIEW_SET_STRICT_MATCH_FILTER:
        case actionNames.CHANGE_VIEW_MODE:
        case actionNames.COMMIT_ACCEPTED_IMAGES_TO_TREE:
        case actionNames.COMMIT_REVERTED_IMAGES_TO_TREE: {
            const {
                tree, groupedTests,
                view: {keyToGroupTestsBy, viewMode, filteredBrowsers, testNameFilter, useMatchCaseFilter, useRegexFilter, strictMatchFilter}
            } = state;
            const viewArgs = {viewMode, filteredBrowsers, testNameFilter, useMatchCaseFilter, useRegexFilter, strictMatchFilter};
            const diff = {groupedTests: {meta: {}}};

            if (!keyToGroupTestsBy) {
                groupMeta({tree, group: groupedTests.meta, diff: diff.groupedTests.meta, ...viewArgs});

                return applyStateUpdate(state, diff);
            }

            const [groupSection, groupKey] = parseKeyToGroupTestsBy(keyToGroupTestsBy);
            ensureDiffProperty(diff, ['groupedTests', groupSection]);

            const group = groupedTests[groupSection];
            const groupDiff = diff.groupedTests[groupSection];

            if (groupSection === SECTIONS.RESULT) {
                const {config: {errorPatterns}} = state;

                groupResult({
                    tree,
                    group,
                    groupKey,
                    errorPatterns,
                    diff: groupDiff,
                    ...viewArgs
                });

                return applyStateUpdate(state, diff);
            }

            if (groupSection === SECTIONS.META) {
                groupMeta({
                    tree,
                    group,
                    groupKey,
                    diff: groupDiff,
                    ...viewArgs
                });

                return applyStateUpdate(state, diff);
            }

            return state;
        }

        default:
            return state;
    }
};
