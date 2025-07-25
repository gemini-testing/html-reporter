import {createSelector} from 'reselect';
import {getImages} from '@/static/new-ui/store/selectors';
import {EntityType, TreeRoot} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import {ImageEntity, Page, State} from '@/static/new-ui/types/store';
import {getNamedImages} from '@/static/new-ui/features/visual-checks/selectors';
import {TreeViewData} from '@/static/new-ui/components/TreeView';
import {TestStatus, ViewMode} from '@/constants';
import {BrowserItem} from '@/types';
import {matchTestName} from '@/static/modules/utils';

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
        (state: State): BrowserItem[] => state.app[Page.visualChecksPage].filteredBrowsers,
        (state: State): string => state.app[Page.visualChecksPage].nameFilter,
        (state: State): boolean => state.app[Page.visualChecksPage].useRegexFilter,
        (state: State): boolean => state.app[Page.visualChecksPage].useMatchCaseFilter
    ],
    (
        images,
        namedImages,
        visualChecksViewMode,
        filteredBrowsers,
        nameFilter,
        useRegexFilter,
        useMatchCaseFilter
    ): VisualTreeViewData => {
        const browsers = new Set(filteredBrowsers.map(({id}) => id));
        const browsersLen = browsers.size;

        const parentNode: TreeRoot = {
            isRoot: true,
            data: undefined
        };

        const stats: Stats = {
            [ViewMode.ALL]: 0,
            [ViewMode.PASSED]: 0,
            [ViewMode.FAILED]: 0
        };

        const tree = Object
            .values(namedImages)
            .filter(({browserId, browserName}) => {
                if (browsersLen && !browsers.has(browserName)) {
                    return false;
                }

                return matchTestName(
                    browserId.slice(0, -browserName.length - 1),
                    browserName,
                    nameFilter,
                    {strictMatchFilter: false, useMatchCaseFilter, useRegexFilter, isNewUi: true}
                ).isMatch;
            })
            .filter(({imageIds}) => {
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
