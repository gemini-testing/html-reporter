import {createSelector} from 'reselect';
import {getImages} from '@/static/new-ui/store/selectors';
import {EntityType, TreeRoot} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import {ImageEntity, Page, State} from '@/static/new-ui/types/store';
import {getNamedImages} from '@/static/new-ui/features/visual-checks/selectors';
import {TreeViewData} from '@/static/new-ui/components/TreeView';
import {TestStatus, ViewMode} from '@/constants';
import {matchTestName} from '@/static/modules/utils';
import {search} from '@/static/modules/search';

export const getVisualChecksViewMode = (state: State): ViewMode => state.app[Page.visualChecksPage].viewMode;

type Stats = Pick<Record<ViewMode, number>, ViewMode.ALL | ViewMode.PASSED | ViewMode.FAILED>;

interface VisualTreeViewData extends TreeViewData{
    stats: Stats;
}

export const getVisualTreeViewData = createSelector(
    [
        getImages,
        getNamedImages,
        getVisualChecksViewMode,
        (state: State): string => state.app[Page.visualChecksPage].nameFilter,
        (state: State): boolean => state.app[Page.visualChecksPage].useRegexFilter,
        (state: State): boolean => state.app[Page.visualChecksPage].useMatchCaseFilter
    ],
    (
        images,
        namedImages,
        visualChecksViewMode,
        nameFilter,
        useRegexFilter,
        useMatchCaseFilter
    ): VisualTreeViewData => {
        const parentNode: TreeRoot = {
            isRoot: true,
            data: undefined
        };

        const stats: Stats = {
            [ViewMode.ALL]: 0,
            [ViewMode.PASSED]: 0,
            [ViewMode.FAILED]: 0
        };

        const founded = search(
            nameFilter,
            useMatchCaseFilter
        );

        const tree = Object
            .values(namedImages)
            .filter(({browserId, browserName, imageIds}) => {
                if (
                    !(
                        matchTestName(
                            browserId,
                            browserName,
                            nameFilter,
                            {strictMatchFilter: false, useMatchCaseFilter, useRegexFilter, isNewUi: true},
                            founded.has(browserId)
                        )
                    )
                ) {
                    return false;
                }

                // filter by real status from last attempt + calculate stats
                const status = images[imageIds[imageIds.length - 1]].status;
                stats[ViewMode.ALL]++;

                switch (status) {
                    case TestStatus.SUCCESS:
                        stats[ViewMode.PASSED]++;
                        return visualChecksViewMode === ViewMode.PASSED || visualChecksViewMode === ViewMode.ALL;
                    case TestStatus.FAIL:
                    case TestStatus.ERROR:
                    case TestStatus.UPDATED:
                        stats[ViewMode.FAILED]++;
                        return visualChecksViewMode === ViewMode.FAILED || visualChecksViewMode === ViewMode.ALL;
                    default:
                        return true;
                }
            })
            .map((item) => ({
                data: {
                    id: item.id,
                    entityId: item.id,
                    entityType: EntityType.Browser,
                    errorStack: undefined,
                    errorTitle: undefined,
                    parentData: undefined,
                    isActive: true,
                    skipReason: 'Unknown reason',
                    status: item.status === TestStatus.RUNNING ? item.status : images[item.imageIds[item.imageIds.length - 1]].status,
                    tags: [],
                    title: [...item.suitePath, item.browserName],
                    images: [
                        images[item.imageIds[item.imageIds.length - 1]] as ImageEntity
                    ]
                },
                parentNode
            }));

        return {
            allTreeNodeIds: tree.map(({data}) => data.id),
            visibleTreeNodeIds: [],
            tree,
            stats
        };
    });
