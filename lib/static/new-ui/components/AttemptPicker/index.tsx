import React, {ReactNode} from 'react';
import {connect} from 'react-redux';

import {State} from '@/static/new-ui/types/store';
import {AttemptPickerItem} from '@/static/new-ui/components/AttemptPickerItem';
import styles from './index.module.css';
import classNames from 'classnames';

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

    const onClickHandler = (resultId: string, attemptIndex: number): void => {
        if (!props.browserId || currentResultId === resultId) {
            return;
        }

        props.onChange?.(props.browserId, resultId, attemptIndex);
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
                    onClick={(): unknown => onClickHandler(resultId, index)}
                />;
            })}
        </div>
    </div>;
}

export const AttemptPicker = connect((state: State) => {
    let resultIds: string[] = [];
    let currentResultId = '';
    const browserId = state.app.suitesPage.currentBrowserId;

    if (browserId && state.tree.browsers.byId[browserId]) {
        resultIds = state.tree.browsers.byId[browserId].resultIds;
        currentResultId = resultIds[state.tree.browsers.stateById[browserId].retryIndex];
    }

    return {
        browserId,
        resultIds,
        currentResultId
    };
})(AttemptPickerInternal);
