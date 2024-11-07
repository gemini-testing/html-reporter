import React, {ReactNode, useMemo} from 'react';
import {Icon} from '@gravity-ui/uikit';
import {
    SquareCheck,
    ChevronsExpandVertical,
    ChevronsCollapseVertical,
    SquareDashed,
    Square,
    CircleInfo,
    Play,
} from '@gravity-ui/icons';

import styles from './index.module.css';
import {
    collapseAll,
    deselectAll,
    expandAll,
    retrySuite,
    selectAll
} from '@/static/modules/actions';
import {useDispatch, useSelector} from 'react-redux';
import {State} from '@/static/new-ui/types/store';
import {CHECKED, INDETERMINATE} from '@/constants/checked-statuses';
import {IconButton} from '@/static/new-ui/components/IconButton';
import classNames from 'classnames';
import {
    getCheckedTests,
    getVisibleBrowserIds,
} from '@/static/modules/selectors/tree';
import {getIsInitialized} from '@/static/new-ui/store/selectors';

interface TreeActionsToolbarProps {
    onHighlightCurrentTest?: () => void;
}

export function TreeActionsToolbar(props: TreeActionsToolbarProps): ReactNode {
    const dispatch = useDispatch();
    const rootSuiteIds = useSelector((state: State) => state.tree.suites.allRootIds);
    const suitesStateById = useSelector((state: State) => state.tree.suites.stateById);
    const browsersStateById = useSelector((state: State) => state.tree.browsers.stateById);
    const browsersById = useSelector((state: State) => state.tree.browsers.byId);
    const selectedTests = useSelector(getCheckedTests);
    const visibleBrowserIds: string[] = useSelector(getVisibleBrowserIds);
    const isInitialized = useSelector(getIsInitialized);
    const isRunning = useSelector((state: State) => state.running);

    const isSelectedAll = useMemo(() => {
        for (const suiteId of rootSuiteIds) {
            if (suitesStateById[suiteId].checkStatus !== CHECKED) {
                return false;
            }
        }

        return true;
    }, [suitesStateById, rootSuiteIds]);

    const isSelectedAtLeastOne = useMemo(() => {
        for (const suiteId of rootSuiteIds) {
            if (suitesStateById[suiteId].shouldBeShown && (suitesStateById[suiteId].checkStatus === CHECKED || suitesStateById[suiteId].checkStatus === INDETERMINATE)) {
                return true;
            }
        }

        return false;
    }, [suitesStateById, rootSuiteIds]);

    const selectedTestsCount = useMemo(() => {
        let count = 0;

        for (const browser of Object.values(browsersStateById)) {
            if (browser.checkStatus === CHECKED) {
                count++;
            }
        }

        return count;
    }, [browsersStateById]);

    const handleSelectAll = (): void => {
        if (isSelectedAll) {
            dispatch(deselectAll());
        } else {
            dispatch(selectAll());
        }
    };

    const handleExpandAll = (): void => {
        dispatch(expandAll());
    };

    const handleCollapseAll = (): void => {
        dispatch(collapseAll());
    };

    const handleRun = (): void => {
        if (isSelectedAtLeastOne) {
            dispatch(retrySuite(selectedTests));
        } else {
            const visibleTests = visibleBrowserIds.map(browserId => ({
                testName: browsersById[browserId].parentId,
                browserName: browsersById[browserId].name
            }));
            dispatch(retrySuite(visibleTests));
        }
    };

    const viewButtons = <>
        <IconButton icon={<Icon data={Play} height={14} />} tooltip={isSelectedAtLeastOne ? 'Run selected' : 'Run visible'} view={'flat'} onClick={handleRun} disabled={isRunning || !isInitialized}></IconButton>
        <div className={styles.buttonsDivider}></div>
        <IconButton icon={<Icon data={SquareDashed} height={14}/>} tooltip={'Focus on active test'} view={'flat'} onClick={props.onHighlightCurrentTest} disabled={!isInitialized}/>
        <IconButton icon={<Icon data={ChevronsExpandVertical} height={14}/>} tooltip={'Expand all'} view={'flat'} onClick={handleExpandAll} disabled={!isInitialized}/>
        <IconButton icon={<Icon data={ChevronsCollapseVertical} height={14}/>} tooltip={'Collapse all'} view={'flat'} onClick={handleCollapseAll} disabled={!isInitialized}/>
        <IconButton icon={<Icon data={isSelectedAll ? Square : SquareCheck}/>} tooltip={isSelectedAll ? 'Deselect all' : 'Select all'} view={'flat'} onClick={handleSelectAll} disabled={!isInitialized}/>
    </>;

    return <div className={styles.container}>
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
