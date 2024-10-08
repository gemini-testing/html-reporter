import {ArrowRotateLeft, CircleCheck, CircleDashed, CircleMinus, CircleXmark, ArrowsRotateLeft} from '@gravity-ui/icons';
import {Spin} from '@gravity-ui/uikit';
import React from 'react';

import {TestStatus} from '@/constants';

export const getIconByStatus = (status: TestStatus): React.JSX.Element => {
    if (status === TestStatus.FAIL || status === TestStatus.ERROR) {
        return <CircleXmark className={'icon-fail'} />;
    } else if (status === TestStatus.SUCCESS) {
        return <CircleCheck className={'icon-success'} />;
    } else if (status === TestStatus.SKIPPED) {
        return <CircleMinus className={'icon-skip'} />;
    } else if (status === TestStatus.RETRY) {
        return <ArrowRotateLeft className={'icon-retry'}/>;
    } else if (status === TestStatus.UPDATED) {
        return <ArrowsRotateLeft className={'icon-updated'}/>;
    } else if (status === TestStatus.RUNNING) {
        return <Spin size={'xs'} />;
    }

    return <CircleDashed />;
};

export const getFullTitleByTitleParts = (titleParts: string[]): string => {
    const DELIMITER = ' ';

    return titleParts.join(DELIMITER).trim();
};
