import React, {ReactNode} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {ArrowRotateRight, CirclePlay} from '@gravity-ui/icons';

import {AttemptPickerItem} from '@/static/new-ui/components/AttemptPickerItem';
import styles from './index.module.css';
import classNames from 'classnames';
import {Button, Divider, Icon, Spin} from '@gravity-ui/uikit';
import {RunTestsFeature} from '@/constants';
import {thunkRunTest} from '@/static/modules/actions';
import {getCurrentBrowser, getCurrentResultId, isTimeTravelPlayerAvailable} from '@/static/new-ui/features/suites/selectors';
import {useAnalytics} from '@/static/new-ui/hooks/useAnalytics';
import {IconButton} from '@/static/new-ui/components/IconButton';
import {toggleTimeTravelPlayerVisibility} from '@/static/modules/actions/snapshots';

interface TestControlPanelProps {
    onAttemptChange?: (browserId: string, resultId: string, attemptIndex: number) => unknown;
}

export function TestControlPanel(props: TestControlPanelProps): ReactNode {
    const {onAttemptChange} = props;

    const browserId = useSelector(state => state.app.suitesPage.currentBrowserId);
    const resultIds = useSelector(state => {
        if (browserId && state.tree.browsers.byId[browserId]) {
            return state.tree.browsers.byId[browserId].resultIds;
        }
        return [];
    });
    const currentResultId = useSelector(getCurrentResultId) ?? '';
    const isPlayerVisible = useSelector(state => state.ui.suitesPage.isSnapshotsPlayerVisible);
    const isRunning = useSelector(state => state.running);

    const analytics = useAnalytics();
    const dispatch = useDispatch();
    const currentBrowser = useSelector(getCurrentBrowser);
    const isRunTestsAvailable = useSelector(state => state.app.availableFeatures)
        .find(feature => feature.name === RunTestsFeature.name);

    const isPlayerAvailable = useSelector(isTimeTravelPlayerAvailable);

    const onAttemptPickHandler = (resultId: string, attemptIndex: number): void => {
        if (!browserId || currentResultId === resultId) {
            return;
        }

        onAttemptChange?.(browserId, resultId, attemptIndex);
    };

    const onRetryTestHandler = (): void => {
        if (currentBrowser) {
            analytics?.trackFeatureUsage({featureName: 'Retry test button click in test control panel'});
            dispatch(thunkRunTest({test: {testName: currentBrowser.parentId, browserName: currentBrowser.name}}));
        }
    };

    const onTogglePlayerVisibility = (): void => {
        analytics?.trackFeatureUsage({featureName: 'Toggle time travel player visibility'});
        dispatch(toggleTimeTravelPlayerVisibility(!isPlayerVisible));
    };

    const showRetryButton = Boolean(isRunTestsAvailable);
    const showPlayerButton = isPlayerAvailable;
    const showDivider = showRetryButton && showPlayerButton;

    return <div className={styles.container}>
        <h3 className={classNames('text-header-1', styles.heading)}>Attempts</h3>
        <div className={styles.attemptsContainer}>
            {resultIds.map((resultId, index) => {
                const isActive = resultId === currentResultId;

                return <AttemptPickerItem
                    key={resultId}
                    resultId={resultId}
                    isActive={isActive}
                    onClick={(): unknown => onAttemptPickHandler(resultId, index)}
                />;
            })}
        </div>
        <div className={styles.buttonsContainer}>
            {showPlayerButton && (
                <IconButton
                    tooltip={isPlayerVisible ? 'Hide Time Travel Player' : 'Show Time Travel Player'}
                    icon={<Icon data={CirclePlay}/>}
                    onClick={onTogglePlayerVisibility}
                    view='outlined'
                    selected={isPlayerVisible}
                />
            )}
            {showDivider && <Divider orientation='vertical' className={styles.divider}/>}
            {showRetryButton && (
                <Button view={'action'} className={styles.retryButton} onClick={onRetryTestHandler} disabled={isRunning}>
                    {isRunning ? <Spin size={'xs'} /> : <Icon data={ArrowRotateRight}/>}Retry
                </Button>
            )}
        </div>
    </div>;
}
