import {produce} from 'immer';
import actionNames from '../../action-names';
import {groupMeta} from './by/meta';
import {groupResult} from './by/result';
import {SECTIONS} from '../../../../constants/group-tests';
import {parseKeyToGroupTestsBy} from '../../utils';

export default produce((state, action) => {
    switch (action.type) {
        case actionNames.INIT_GUI_REPORT:
        case actionNames.INIT_STATIC_REPORT:
        case actionNames.GROUP_TESTS_BY_KEY:
        case actionNames.TESTS_END:
        case actionNames.BROWSERS_SELECTED:
        case actionNames.VIEW_UPDATE_FILTER_BY_NAME:
        case actionNames.VIEW_SET_STRICT_MATCH_FILTER:
        case actionNames.CHANGE_VIEW_MODE:
        case actionNames.ACCEPT_SCREENSHOT:
        case actionNames.ACCEPT_OPENED_SCREENSHOTS: {
            const {
                tree, groupedTests,
                view: {keyToGroupTestsBy, viewMode, filteredBrowsers, testNameFilter, strictMatchFilter}
            } = state;
            const viewArgs = {viewMode, filteredBrowsers, testNameFilter, strictMatchFilter};

            if (!keyToGroupTestsBy) {
                groupMeta({tree, group: groupedTests.meta, ...viewArgs});

                return;
            }

            const [groupSection, groupKey] = parseKeyToGroupTestsBy(keyToGroupTestsBy);
            const group = groupedTests[groupSection];

            if (groupSection === SECTIONS.RESULT) {
                const {config: {errorPatterns}} = state;

                return groupResult({tree, group, groupKey, errorPatterns, ...viewArgs});
            }

            if (groupSection === SECTIONS.META) {
                return groupMeta({tree, group, groupKey, ...viewArgs});
            }

            break;
        }

        default:
            return state;
    }
});
