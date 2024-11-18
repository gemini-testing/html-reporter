import {createSelector} from 'reselect';
import {CheckStatus, INDETERMINATE, UNCHECKED} from '@/constants/checked-statuses';
import {EntityType, TreeViewItemData} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import {GroupEntity, State} from '@/static/new-ui/types/store';
import {getBrowsersState, getGroups, getSuitesState} from '@/static/new-ui/store/selectors';

export const getItemCheckStatus = createSelector(
    [getBrowsersState, getSuitesState, getGroups, (_state: State, item: TreeViewItemData): TreeViewItemData => item],
    (browsersStateById, suitesStateById, groups, item): CheckStatus => {
        if (item.entityType === EntityType.Suite) {
            return suitesStateById[item.entityId].checkStatus;
        } else if (item.entityType === EntityType.Browser) {
            return browsersStateById[item.entityId].checkStatus;
        } else if (item.entityType === EntityType.Group) {
            const group = Object.values(groups).find(group => group.id === item.entityId) as GroupEntity;
            const childCount = group.browserIds.length;
            const checkedCount = group.browserIds.reduce((sum, browserId) => {
                return sum + browsersStateById[browserId].checkStatus;
            }, 0);

            return Number((checkedCount === childCount) || (checkedCount && INDETERMINATE)) as CheckStatus;
        }

        console.warn(`Unknown entity type while trying to determine checkbox status. Item: ${JSON.stringify(item)}. ` +
        'Please report this to our team at https://github.com/gemini-testing/html-reporter/issues/new.');
        return UNCHECKED;
    }
);
