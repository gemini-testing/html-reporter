import {Divider, Icon} from '@gravity-ui/uikit';
import {CirclePlay} from '@gravity-ui/icons';
import React, {ReactNode} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {AttemptPickerItem} from '@/static/new-ui/components/AttemptPickerItem';
import styles from './index.module.css';
import classNames from 'classnames';
import {getCurrentBrowser, getCurrentResultId, isTimeTravelPlayerAvailable} from '@/static/new-ui/features/suites/selectors';
import {RunTestButton} from '@/static/new-ui/components/RunTest';
import {useAnalytics} from '../../../../hooks/useAnalytics';
import {IconButton} from '../../../../components/IconButton';
import {isFeatureAvailable} from '../../../../utils/features';
import {RunTestsFeature} from '@/constants';
import {toggleTimeTravelPlayerVisibility} from '@/static/modules/actions/snapshots';

interface TestControlPanelProps {
    onAttemptChange?: (browserId: string, resultId: string, attemptIndex: number) => unknown;
}

export function TestControlPanel(props: TestControlPanelProps): ReactNode {
    const {onAttemptChange} = props;

    const dispatch = useDispatch();
    const analytics = useAnalytics();

    const browserId = useSelector(state => state.app.suitesPage.currentBrowserId);
    const resultIds = useSelector(state => {
        if (browserId && state.tree.browsers.byId[browserId]) {
            return state.tree.browsers.byId[browserId].resultIds;
        }
        return [];
    });
    const currentBrowser = useSelector(getCurrentBrowser);
    const currentResultId = useSelector(getCurrentResultId) ?? '';

    const onAttemptPickHandler = (resultId: string, attemptIndex: number): void => {
        if (!browserId || currentResultId === resultId) {
            return;
        }

        onAttemptChange?.(browserId, resultId, attemptIndex);
    };

    const isRunTestsAvailable = isFeatureAvailable(RunTestsFeature);
    const isPlayerAvailable = useSelector(isTimeTravelPlayerAvailable);
    const isPlayerVisible = useSelector(state => state.ui.suitesPage.isSnapshotsPlayerVisible);

    const showDivider = isRunTestsAvailable && isPlayerAvailable;

    const onTogglePlayerVisibility = (): void => {
        analytics?.trackFeatureUsage({featureName: 'Toggle time travel player visibility'});
        dispatch(toggleTimeTravelPlayerVisibility(!isPlayerVisible));
    };

    return (
        <div className={styles.container}>
            <h3 className={classNames('text-header-1', styles.heading)}>Attempts</h3>
            <div className={styles.attemptsContainer}>
                {resultIds.map((resultId, index) => (
                    <AttemptPickerItem
                        key={resultId}
                        resultId={resultId}
                        isActive={resultId === currentResultId}
                        onClick={(): unknown => onAttemptPickHandler(resultId, index)}
                    />
                ))}
            </div>
            <div className={styles.buttonsContainer}>
                {isPlayerAvailable && (
                    <IconButton
                        tooltip={isPlayerVisible ? 'Hide Time Travel Player' : 'Show Time Travel Player'}
                        icon={<Icon data={CirclePlay}/>}
                        onClick={onTogglePlayerVisibility}
                        view='outlined'
                        selected={isPlayerVisible}
                    />
                )}
                {showDivider && <Divider orientation='vertical' className={styles.divider}/>}
                <RunTestButton browser={currentBrowser}/>
            </div>
        </div>
    );
}
