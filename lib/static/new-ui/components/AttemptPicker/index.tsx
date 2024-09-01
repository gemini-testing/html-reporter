import {Flex} from '@gravity-ui/uikit';
import React, {ReactNode} from 'react';
import {connect} from 'react-redux';

import {State} from '@/static/new-ui/types/store';
import {AttemptPickerItem} from '@/static/new-ui/components/AttemptPickerItem';

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

    return <Flex alignItems={'center'} gap={5}>
        <h3 className='text-header-1'>Attempts</h3>
        <div>
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
    </Flex>;
}

export const AttemptPicker = connect((state: State) => {
    let resultIds: string[] = [];
    let currentResultId = '';
    const browserId = state.app.currentSuiteId;

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
