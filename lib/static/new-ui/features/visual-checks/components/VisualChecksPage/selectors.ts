import {createSelector} from 'reselect';
import {getImages} from '@/static/new-ui/store/selectors';
import {TreeNode} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import {ImageEntity, State} from '@/static/new-ui/types/store';
import {getNamedImages} from '@/static/new-ui/features/visual-checks/selectors';
import {TreeViewData} from '@/static/new-ui/components/TreeView';
import {TestStatus, ViewMode} from '@/constants';

export const getVisualChecksViewMode = (state: State): ViewMode => state.view.visualChecksViewMode;

// Converts the existing store structure to the one that can be consumed by GravityUI
export const getVisualThreeViewData = createSelector(
    [getImages, getNamedImages, getVisualChecksViewMode],
    (images, namedImages, visualChecksViewMode): TreeViewData => {
        const parentNode = {
            isRoot: true,
            data: undefined
        };

        return {
            allTreeNodeIds: Object.keys(namedImages),
            visibleTreeNodeIds: [],
            tree: Object
                .values(namedImages)
                .filter(({status}) => {
                    switch (visualChecksViewMode) {
                        case ViewMode.PASSED:
                            return status === TestStatus.SUCCESS;
                        case ViewMode.FAILED:
                            return status === TestStatus.FAIL || status === TestStatus.UPDATED;
                        default:
                            return true;
                    }
                })
                .map((item) => {
                    return {
                        data: {
                            id: item.id,
                            entityId: item.id,
                            entityType: 'browser',
                            errorStack: undefined,
                            errorTitle: undefined,
                            parentData: undefined,
                            isActive: true,
                            skipReason: 'Unknown reason',
                            status: item.status,
                            tags: [],
                            title: [...item.suitePath, item.browserName],
                            images: [
                                images[item.imageIds[0]] as ImageEntity
                            ]
                        },
                        parentNode
                    };
                }) as TreeNode[]
        };
    });
