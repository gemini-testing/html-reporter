import React, {ReactNode} from 'react';
import {connect, useDispatch, useSelector} from 'react-redux';
import {ArrowRotateRight} from '@gravity-ui/icons';

import {AttemptPickerItem} from '@/static/new-ui/components/AttemptPickerItem';
import styles from './index.module.css';
import classNames from 'classnames';
import {Button, Icon, Spin} from '@gravity-ui/uikit';
import {RunTestsFeature} from '@/constants';
import {retryTest} from '@/static/modules/actions';
import {getCurrentBrowser, getCurrentResultId} from '@/static/new-ui/features/suites/selectors';

interface AttemptPickerProps {
    onChange?: (browserId: string, resultId: string, attemptIndex: number) => unknown;
}

interface AttemptPickerInternalProps extends AttemptPickerProps {
    browserId: string | null;
    resultIds: string[];
    currentResultId: string;
}

function AttemptPickerInternal(props: AttemptPickerInternalProps): ReactNode {
    const {resultIds, currentResultId} = props;

    const dispatch = useDispatch();
    const currentBrowser = useSelector(getCurrentBrowser);
    const isRunTestsAvailable = useSelector(state => state.app.availableFeatures)
        .find(feature => feature.name === RunTestsFeature.name);
    const isRunning = useSelector(state => state.running);

    const onAttemptPickHandler = (resultId: string, attemptIndex: number): void => {
        if (!props.browserId || currentResultId === resultId) {
            return;
        }

        props.onChange?.(props.browserId, resultId, attemptIndex);
    };

    const onRetryTestHandler = (): void => {
        if (currentBrowser) {
            dispatch(retryTest({testName: currentBrowser.parentId, browserName: currentBrowser.name}));
        }
    };

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
        {isRunTestsAvailable && <Button view={'action'} className={styles.retryButton} onClick={onRetryTestHandler} disabled={isRunning}>
            {isRunning ? <Spin size={'xs'} /> : <Icon data={ArrowRotateRight}/>}Retry
        </Button>}
    </div>;
}

export const AttemptPicker = connect(state => {
    let resultIds: string[] = [];
    const browserId = state.app.suitesPage.currentBrowserId;

    if (browserId && state.tree.browsers.byId[browserId]) {
        resultIds = state.tree.browsers.byId[browserId].resultIds;
    }

    return {
        browserId,
        resultIds,
        currentResultId: getCurrentResultId(state) ?? ''
    };
})(AttemptPickerInternal);
