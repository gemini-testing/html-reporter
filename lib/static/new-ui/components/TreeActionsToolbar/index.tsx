import {Icon, Popover, Spin} from '@gravity-ui/uikit';
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
    SquareMinus,
    ListUl,
    Hierarchy,
    GearPlay
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
import {TestStatus} from '@/constants';
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
import {getSuitesTreeViewData} from '@/static/new-ui/features/suites/components/SuitesPage/selectors';
import {GroupBySelect} from '@/static/new-ui/features/suites/components/GroupBySelect';
import {SortBySelect} from '@/static/new-ui/features/suites/components/SortBySelect';
import {thunkAcceptImages, thunkRevertImages} from '@/static/modules/actions/screenshots';
import {useAnalytics} from '@/static/new-ui/hooks/useAnalytics';
import ExtensionPoint, {getExtensionPointComponents} from '../../../components/extension-point';
import {ExtensionPointName} from '../../constants/plugins';
import * as plugins from '../../../modules/plugins';

interface TreeActionsToolbarProps {
    onHighlightCurrentTest?: () => void;
    className?: string;
}

const ANALYTICS_PREFIX = 'Tree actions toolbar:';

export function TreeActionsToolbar({onHighlightCurrentTest, className}: TreeActionsToolbarProps): ReactNode {
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
    const isRunning = useSelector(state => (
        state.tree.suites.allRootIds.some((id) => state.tree.suites.byId[id].status === TestStatus.RUNNING)
    ));

    const isEditScreensAvailable = useSelector(state => state.app.availableFeatures)
        .find(feature => feature.name === EditScreensFeature.name);

    const isSelectedAll = useMemo(() => {
        const visibleRootSuiteIds = rootSuiteIds.filter(suiteId => suitesStateById[suiteId].shouldBeShown);
        return visibleRootSuiteIds.length > 0 && visibleRootSuiteIds.every(suiteId => suitesStateById[suiteId].checkStatus === CHECKED);
    }, [suitesStateById, rootSuiteIds]);

    const isSelectedAtLeastOne = useMemo(() => {
        return rootSuiteIds.some(suiteId => {
            const isShown = suitesStateById[suiteId].shouldBeShown;
            const isChecked = suitesStateById[suiteId].checkStatus === CHECKED || suitesStateById[suiteId].checkStatus === INDETERMINATE;

            return isShown && isChecked;
        });
    }, [suitesStateById, rootSuiteIds]);

    const isIndeterminate = isSelectedAtLeastOne && !isSelectedAll;

    const isStaticImageAccepterEnabled = useSelector(getIsStaticImageAccepterEnabled);
    const isGuiMode = useSelector(getIsGui);
    const areCheckboxesNeeded = useSelector(getAreCheckboxesNeeded);
    const visibleImages: ImageEntity[] = useSelector(getVisibleImages);
    const selectedImages: ImageEntity[] = useSelector(getSelectedImages);
    const activeImages = isSelectedAtLeastOne ? selectedImages : visibleImages;

    const treeViewMode = useSelector(state => state.ui.suitesPage.treeViewMode);
    const currentTreeNodeId = useSelector(state => state.app.suitesPage.currentTreeNodeId);
    const {visibleTreeNodeIds} = useSelector(getSuitesTreeViewData);
    const isFocusAvailable = isInitialized && currentTreeNodeId && visibleTreeNodeIds.includes(currentTreeNodeId);

    const isAtLeastOneAcceptable = activeImages.some(image => isAcceptable(image));
    const isAtLeastOneRevertable = activeImages.some(image => isScreenRevertable({image, gui: isGuiMode, isLastResult: true, isStaticImageAccepterEnabled}));
    const isUndoButtonVisible = isAtLeastOneRevertable && !isAtLeastOneAcceptable;

    const selectedTestsCount = useMemo(() => {
        const browserStates = Object.values(browsersStateById);

        return browserStates.reduce((acc, state) => acc + Number(state.checkStatus === CHECKED), 0);
    }, [browsersStateById]);

    const handleToggleAll = (): void => {
        if (isSelectedAtLeastOne) {
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

    const loadedPluginConfigs = plugins.getLoadedConfigs();
    const pluginComponents = getExtensionPointComponents(loadedPluginConfigs, ExtensionPointName.RunTestOptions);
    const hasRunTestOptions = pluginComponents.length > 0;

    const getViewButtons = (): ReactNode => (
        <>
            {isRunTestsAvailable && (
                isRunning
                    ? (
                        <Spin size={'xs'} style={{marginRight: '6px'}}/>
                    ) : (
                        <IconButton
                            className={styles.iconButton}
                            icon={<Icon data={Play} height={14}/>}
                            tooltip={`Run ${selectedOrVisible}`}
                            view={'flat'}
                            onClick={handleRun}
                            disabled={isRunning || !isInitialized}
                        />
                    )
            )}
            {isRunTestsAvailable && hasRunTestOptions && <Popover
                content={<div className={styles.runOptionsContainer}><ExtensionPoint name={ExtensionPointName.RunTestOptions}></ExtensionPoint></div>}
                trigger='click'
            >
                <IconButton
                    view='flat'
                    disabled={isRunning || !isInitialized}
                    className={classNames(styles.iconButton)}
                    icon={<Icon data={GearPlay} height={14}/>}
                    tooltip='View run options'
                />
            </Popover>}
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
            <IconButton icon={<Icon data={SquareDashed} height={14}/>} tooltip={'Focus on active test'} view={'flat'} onClick={onHighlightCurrentTest} disabled={!isFocusAvailable}/>
            <IconButton icon={<Icon data={ChevronsExpandVertical} height={14}/>} tooltip={'Expand all'} view={'flat'} onClick={handleExpandAll} disabled={!isInitialized}/>
            <IconButton icon={<Icon data={ChevronsCollapseVertical} height={14}/>} tooltip={'Collapse all'} view={'flat'} onClick={handleCollapseAll} disabled={!isInitialized}/>
            {areCheckboxesNeeded && <IconButton
                icon={<Icon data={isIndeterminate ? SquareMinus : (isSelectedAll ? SquareCheck : Square)}/>}
                tooltip={isSelectedAtLeastOne ? 'Deselect all' : 'Select all'}
                view={'flat'}
                onClick={handleToggleAll}
                disabled={!isInitialized}
                className={styles.selectAllButton}
                qa="select-all-button"
            />}
        </>
    );

    return <div className={classNames(styles.container, className)}>
        {/* This one is needed for paddings to work correctly for absolutely positioned selectedContainer */}
        <div className={styles.innerContainer}>
            <GroupBySelect />
            <SortBySelect />
            <div className={styles.buttonsContainer}>
                {getViewButtons()}
            </div>

            <div
                className={classNames(styles.selectedContainer, {[styles['selected-container--visible']]: isSelectedAtLeastOne})}>
                <div className={styles.selectedTitle}>
                    <Icon data={CircleInfo}/>
                    <span data-qa="selected-tests-count">{selectedTestsCount} {selectedTestsCount > 1 ? 'tests' : 'test'} selected</span>
                </div>

                <div className={styles.buttonsContainer}>
                    {getViewButtons()}
                </div>
            </div>
        </div>
    </div>;
}
