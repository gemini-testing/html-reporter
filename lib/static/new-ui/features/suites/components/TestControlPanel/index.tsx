import {Divider, Hotkey, Icon} from '@gravity-ui/uikit';
import {CirclePlay} from '@gravity-ui/icons';
import React, {ReactNode, useCallback} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {AttemptPickerItem} from '@/static/new-ui/components/AttemptPickerItem';
import styles from './index.module.css';
import classNames from 'classnames';
import {getCurrentBrowser, getCurrentResult, getCurrentResultId, isTimeTravelPlayerAvailable} from '@/static/new-ui/features/suites/selectors';
import {RunTestButton} from '@/static/new-ui/components/RunTest';
import {useAnalytics} from '../../../../hooks/useAnalytics';
import {useHotkey} from '../../../../hooks/useHotkey';
import {IconButton} from '../../../../components/IconButton';
import {isFeatureAvailable} from '../../../../utils/features';
import {RunTestsFeature} from '@/constants';
import {toggleTimeTravelPlayerVisibility} from '@/static/modules/actions/snapshots';
import {thunkRunTest} from '@/static/modules/actions';
import {hasBrowsers} from '@/static/new-ui/types/store';
import {BrowserSelect} from './BrowserSelect';

interface TestControlPanelProps {
    onAttemptChange?: (browserId: string, resultId: string, attemptIndex: number) => unknown;
    onBrowserChange?: (browserId: string) => unknown;
}

export function TestControlPanel(props: TestControlPanelProps): ReactNode {
    const {onAttemptChange, onBrowserChange: onBrowserChangeProp} = props;

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
    const currentResult = useSelector(getCurrentResult);
    const currentResultId = useSelector(getCurrentResultId) ?? '';

    const availableBrowsers = useSelector(state => {
        if (!currentResult?.suitePath) {
            return [];
        }
        const suiteId = currentResult.suitePath.join(' ');
        const suite = state.tree.suites.byId[suiteId];
        if (!suite || !hasBrowsers(suite)) {
            return [];
        }
        return suite.browserIds.map(id => {
            const browser = state.tree.browsers.byId[id];
            return browser ? {id: browser.id, name: browser.name} : null;
        }).filter(Boolean) as {id: string; name: string}[];
    });

    const onAttemptPickHandler = (resultId: string, attemptIndex: number): void => {
        if (!browserId || currentResultId === resultId) {
            return;
        }

        onAttemptChange?.(browserId, resultId, attemptIndex);
    };

    const isRunTestsAvailable = isFeatureAvailable(RunTestsFeature);
    const isPlayerAvailable = useSelector(isTimeTravelPlayerAvailable);
    const isPlayerVisible = useSelector(state => state.ui.suitesPage.isSnapshotsPlayerVisible);
    const isRunning = useSelector(state => state.running);

    const showDivider = isRunTestsAvailable && isPlayerAvailable;

    const onTogglePlayerVisibility = useCallback((): void => {
        analytics?.trackFeatureUsage({featureName: 'Toggle time travel player visibility'});
        dispatch(toggleTimeTravelPlayerVisibility(!isPlayerVisible));
    }, [analytics, dispatch, isPlayerVisible]);

    const onRunTest = useCallback((): void => {
        if (currentBrowser && !isRunning) {
            analytics?.trackFeatureUsage({featureName: 'Run test via hotkey R'});
            dispatch(thunkRunTest({test: {testName: currentBrowser.parentId, browserName: currentBrowser.name}}));
        }
    }, [currentBrowser, isRunning, analytics, dispatch]);

    useHotkey('r', onRunTest, {enabled: isRunTestsAvailable && !isRunning});
    useHotkey('p', onTogglePlayerVisibility, {enabled: isPlayerAvailable});

    const onBrowserChange = useCallback((newBrowserId: string): void => {
        onBrowserChangeProp?.(newBrowserId);
    }, [onBrowserChangeProp]);

    return (
        <div className={styles.container}>
            {availableBrowsers.length > 0 && (<>
                <BrowserSelect
                    availableBrowsers={availableBrowsers}
                    currentBrowserId={browserId}
                    onBrowserChange={onBrowserChange}
                />
                <Divider orientation="vertical" className={styles.divider} />
            </>)}
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
                        tooltip={<>{isPlayerVisible ? 'Hide Time Travel Player' : 'Show Time Travel Player'} ⋅ <Hotkey value="p" view="light" /></>}
                        icon={<Icon data={CirclePlay}/>}
                        onClick={onTogglePlayerVisibility}
                        view='outlined'
                        selected={isPlayerVisible}
                    />
                )}
                {showDivider && <Divider orientation='vertical' className={styles.divider}/>}
                <RunTestButton browser={currentBrowser} hotkey={<Hotkey className={styles.hotkey} view="dark" value="r" />}/>
            </div>
        </div>
    );
}
