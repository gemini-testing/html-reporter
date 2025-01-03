import {Icon} from '@gravity-ui/uikit';
import classNames from 'classnames';
import {
    ArrowUturnCcwLeft,
    Check,
    ChevronsCollapseVertical,
    ChevronsExpandVertical,
    CircleInfo,
    Play,
    Square,
    SquareCheck,
    SquareDashed,
    ListUl,
    Hierarchy
} from '@gravity-ui/icons';
import React, {ReactNode, useMemo} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import styles from './index.module.css';
import {
    deselectAll,
    selectAll,
    setAllTreeNodesState, setTreeViewMode,
    staticAccepterStageScreenshot,
    staticAccepterUnstageScreenshot, thunkRunTests
} from '@/static/modules/actions';
import {ImageEntity, TreeViewMode} from '@/static/new-ui/types/store';
import {CHECKED, INDETERMINATE} from '@/constants/checked-statuses';
import {IconButton} from '@/static/new-ui/components/IconButton';
import {
    getCheckedTests,
    getSelectedImages,
    getVisibleBrowserIds,
    getVisibleImages
} from '@/static/modules/selectors/tree';
import {
    getAreCheckboxesNeeded,
    getIsGui,
    getIsInitialized,
    getIsStaticImageAccepterEnabled
} from '@/static/new-ui/store/selectors';
import {isAcceptable, isScreenRevertable} from '@/static/modules/utils';
import {EditScreensFeature, RunTestsFeature} from '@/constants';
import {getTreeViewItems} from '@/static/new-ui/features/suites/components/SuitesTreeView/selectors';
import {GroupBySelect} from '@/static/new-ui/features/suites/components/GroupBySelect';
import {SortBySelect} from '@/static/new-ui/features/suites/components/SortBySelect';
import {thunkAcceptImages, thunkRevertImages} from '@/static/modules/actions/screenshots';
import {useAnalytics} from '@/static/new-ui/hooks/useAnalytics';

interface TreeActionsToolbarProps {
    onHighlightCurrentTest?: () => void;
}

const ANALYTICS_PREFIX = 'Tree actions toolbar:';

export function TreeActionsToolbar(props: TreeActionsToolbarProps): ReactNode {
    const dispatch = useDispatch();
    const analytics = useAnalytics();

    const rootSuiteIds = useSelector(state => state.tree.suites.allRootIds);
    const suitesStateById = useSelector(state => state.tree.suites.stateById);
    const browsersStateById = useSelector(state => state.tree.browsers.stateById);
    const browsersById = useSelector(state => state.tree.browsers.byId);
    const selectedTests = useSelector(getCheckedTests);
    const visibleBrowserIds: string[] = useSelector(getVisibleBrowserIds);
    const isInitialized = useSelector(getIsInitialized);

    const isRunTestsAvailable = useSelector(state => state.app.availableFeatures)
        .find(feature => feature.name === RunTestsFeature.name);
    const isRunning = useSelector(state => state.running);

    const isEditScreensAvailable = useSelector(state => state.app.availableFeatures)
        .find(feature => feature.name === EditScreensFeature.name);

    const isSelectedAll = useMemo(() => {
        return rootSuiteIds.every(suiteId => suitesStateById[suiteId].checkStatus === CHECKED);
    }, [suitesStateById, rootSuiteIds]);

    const isSelectedAtLeastOne = useMemo(() => {
        return rootSuiteIds.some(suiteId => {
            const isShown = suitesStateById[suiteId].shouldBeShown;
            const isChecked = suitesStateById[suiteId].checkStatus === CHECKED || suitesStateById[suiteId].checkStatus === INDETERMINATE;

            return isShown && isChecked;
        });
    }, [suitesStateById, rootSuiteIds]);

    const isStaticImageAccepterEnabled = useSelector(getIsStaticImageAccepterEnabled);
    const isGuiMode = useSelector(getIsGui);
    const areCheckboxesNeeded = useSelector(getAreCheckboxesNeeded);
    const visibleImages: ImageEntity[] = useSelector(getVisibleImages);
    const selectedImages: ImageEntity[] = useSelector(getSelectedImages);
    const activeImages = isSelectedAtLeastOne ? selectedImages : visibleImages;

    const treeViewMode = useSelector(state => state.ui.suitesPage.treeViewMode);
    const currentTreeNodeId = useSelector(state => state.app.suitesPage.currentTreeNodeId);
    const {visibleTreeNodeIds} = useSelector(getTreeViewItems);
    const isFocusAvailable = isInitialized && currentTreeNodeId && visibleTreeNodeIds.includes(currentTreeNodeId);

    const isAtLeastOneAcceptable = activeImages.some(image => isAcceptable(image));
    const isAtLeastOneRevertable = activeImages.some(image => isScreenRevertable({image, gui: isGuiMode, isLastResult: true, isStaticImageAccepterEnabled}));
    const isUndoButtonVisible = isAtLeastOneRevertable && !isAtLeastOneAcceptable;

    const selectedTestsCount = useMemo(() => {
        const browserStates = Object.values(browsersStateById);

        return browserStates.reduce((acc, state) => acc + Number(state.checkStatus === CHECKED), 0);
    }, [browsersStateById]);

    const handleToggleAll = (): void => {
        if (isSelectedAll) {
            dispatch(deselectAll());
        } else {
            dispatch(selectAll());
        }
    };

    const handleExpandAll = (): void => {
        dispatch(setAllTreeNodesState({isExpanded: true}));
    };

    const handleCollapseAll = (): void => {
        dispatch(setAllTreeNodesState({isExpanded: false}));
    };

    const handleRun = (): void => {
        analytics?.trackFeatureUsage({featureName: `${ANALYTICS_PREFIX} run tests`});
        if (isSelectedAtLeastOne) {
            dispatch(thunkRunTests({tests: selectedTests}));
        } else {
            const visibleTests = visibleBrowserIds.map(browserId => ({
                testName: browsersById[browserId].parentId,
                browserName: browsersById[browserId].name
            }));
            dispatch(thunkRunTests({tests: visibleTests}));
        }
    };

    const handleUndo = (): void => {
        const acceptableImageIds = activeImages
            .filter(image => isScreenRevertable({image, gui: isGuiMode, isLastResult: true, isStaticImageAccepterEnabled}))
            .map(image => image.id);
        analytics?.trackFeatureUsage({featureName: `${ANALYTICS_PREFIX} revert screenshots`});

        if (isStaticImageAccepterEnabled) {
            dispatch(staticAccepterUnstageScreenshot(acceptableImageIds));
        } else {
            dispatch(thunkRevertImages({imageIds: acceptableImageIds}));
        }
    };

    const handleAccept = (): void => {
        const acceptableImageIds = activeImages
            .filter(image => isAcceptable(image))
            .map(image => image.id);
        analytics?.trackFeatureUsage({featureName: `${ANALYTICS_PREFIX} accept screenshots`});
        analytics?.trackScreenshotsAccept({acceptedImagesCount: acceptableImageIds.length});

        if (isStaticImageAccepterEnabled) {
            dispatch(staticAccepterStageScreenshot(acceptableImageIds));
        } else {
            dispatch(thunkAcceptImages({imageIds: acceptableImageIds}));
        }
    };

    const handleToggleTreeView = (): void => {
        const newTreeViewMode = treeViewMode === TreeViewMode.Tree ? TreeViewMode.List : TreeViewMode.Tree;
        analytics?.trackFeatureUsage({featureName: `${ANALYTICS_PREFIX} change tree view mode`, treeViewMode: newTreeViewMode});
        dispatch(setTreeViewMode({treeViewMode: newTreeViewMode}));
    };

    const selectedOrVisible = isSelectedAtLeastOne ? 'selected' : 'visible';
    const areActionsDisabled = isRunning || !isInitialized;

    const viewButtons = <>
        {isRunTestsAvailable && <IconButton className={styles.iconButton} icon={<Icon data={Play} height={14}/>}
            tooltip={`Run ${selectedOrVisible}`} view={'flat'} onClick={handleRun}
            disabled={isRunning || !isInitialized}></IconButton>}
        {isEditScreensAvailable && (
            isUndoButtonVisible ?
                <IconButton className={styles.iconButton} icon={<Icon data={ArrowUturnCcwLeft} />} tooltip={`Undo accepting ${selectedOrVisible} screenshots`} view={'flat'} onClick={handleUndo} disabled={areActionsDisabled}></IconButton> :
                <IconButton className={styles.iconButton} icon={<Icon data={Check} />} tooltip={`Accept ${selectedOrVisible} screenshots`} view={'flat'} onClick={handleAccept} disabled={areActionsDisabled || !isAtLeastOneAcceptable}></IconButton>
        )}
        {(isRunTestsAvailable || isEditScreensAvailable) && <div className={styles.buttonsDivider}></div>}
        <IconButton
            icon={<Icon data={treeViewMode === TreeViewMode.Tree ? ListUl : Hierarchy} height={14}/>}
            tooltip={treeViewMode === TreeViewMode.Tree ? 'Switch to list view' : 'Switch to tree view'}
            view={'flat'}
            onClick={handleToggleTreeView}
            disabled={!isInitialized} />
        <IconButton icon={<Icon data={SquareDashed} height={14}/>} tooltip={'Focus on active test'} view={'flat'} onClick={props.onHighlightCurrentTest} disabled={!isFocusAvailable}/>
        <IconButton icon={<Icon data={ChevronsExpandVertical} height={14}/>} tooltip={'Expand all'} view={'flat'} onClick={handleExpandAll} disabled={!isInitialized}/>
        <IconButton icon={<Icon data={ChevronsCollapseVertical} height={14}/>} tooltip={'Collapse all'} view={'flat'} onClick={handleCollapseAll} disabled={!isInitialized}/>
        {areCheckboxesNeeded && <IconButton icon={<Icon data={isSelectedAll ? Square : SquareCheck}/>} tooltip={isSelectedAll ? 'Deselect all' : 'Select all'} view={'flat'} onClick={handleToggleAll} disabled={!isInitialized}/>}
    </>;

    return <div className={styles.container}>
        <GroupBySelect />
        <SortBySelect />
        <div className={styles.buttonsContainer}>
            {viewButtons}
        </div>

        <div
            className={classNames(styles.selectedContainer, {[styles['selected-container--visible']]: isSelectedAtLeastOne})}>
            <div className={styles.selectedTitle}>
                <Icon data={CircleInfo}/>
                <span>{selectedTestsCount} {selectedTestsCount > 1 ? 'tests' : 'test'} selected</span>
            </div>

            <div className={styles.buttonsContainer}>
                {viewButtons}
            </div>
        </div>
    </div>;
}
