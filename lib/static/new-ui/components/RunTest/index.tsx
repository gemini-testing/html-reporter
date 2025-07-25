import React, {ReactNode} from 'react';

import styles from './index.module.css';
import {IconButton} from '@/static/new-ui/components/IconButton';
import {Button, Divider, Icon, Spin} from '@gravity-ui/uikit';
import {ArrowRotateRight, CirclePlay} from '@gravity-ui/icons';
import {thunkRunTest} from '@/static/modules/actions';
import {toggleTimeTravelPlayerVisibility} from '@/static/modules/actions/snapshots';
import {useDispatch, useSelector} from 'react-redux';
import {isTimeTravelPlayerAvailable} from '../../features/suites/selectors';
import {RunTestsFeature} from '@/constants';
import {useAnalytics} from '../../hooks/useAnalytics';
import type {BrowserEntity} from '@/static/new-ui/types/store';

interface RunTestProps {
    showPlayer?: boolean;
    browser: BrowserEntity | null;
}

export const RunTest = ({showPlayer = true, browser}: RunTestProps): ReactNode => {
    const isPlayerVisible = useSelector(state => state.ui.suitesPage.isSnapshotsPlayerVisible);
    const isRunning = useSelector(state => state.running);

    const analytics = useAnalytics();
    const dispatch = useDispatch();
    const isRunTestsAvailable = useSelector(state => state.app.availableFeatures)
        .find(feature => feature.name === RunTestsFeature.name);

    const isPlayerAvailable = useSelector(isTimeTravelPlayerAvailable);

    const onRetryTestHandler = (): void => {
        if (browser) {
            analytics?.trackFeatureUsage({featureName: 'Retry test button click in test control panel'});
            dispatch(thunkRunTest({test: {testName: browser.parentId, browserName: browser.name}}));
        }
    };

    const onTogglePlayerVisibility = (): void => {
        analytics?.trackFeatureUsage({featureName: 'Toggle time travel player visibility'});
        dispatch(toggleTimeTravelPlayerVisibility(!isPlayerVisible));
    };

    const showRetryButton = Boolean(isRunTestsAvailable);
    const showPlayerButton = isPlayerAvailable && showPlayer;
    const showDivider = showRetryButton && showPlayerButton;

    return (
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
    );
};
