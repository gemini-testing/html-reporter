import React, {ReactNode} from 'react';
import {useSelector} from 'react-redux';

import {AttemptPickerItem} from '@/static/new-ui/components/AttemptPickerItem';
import styles from './index.module.css';
import classNames from 'classnames';
import {getCurrentBrowser, getCurrentResultId} from '@/static/new-ui/features/suites/selectors';
import {RunTest} from '@/static/new-ui/components/RunTest';

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
    const currentBrowser = useSelector(getCurrentBrowser);
    const currentResultId = useSelector(getCurrentResultId) ?? '';

    const onAttemptPickHandler = (resultId: string, attemptIndex: number): void => {
        if (!browserId || currentResultId === resultId) {
            return;
        }

        onAttemptChange?.(browserId, resultId, attemptIndex);
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
            <RunTest browser={currentBrowser}/>
        </div>
    );
}
