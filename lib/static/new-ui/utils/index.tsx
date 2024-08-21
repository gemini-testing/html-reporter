import {TestStatus} from '@/constants';
import {CircleCheck, CircleDashed, CircleXmark, CircleMinus} from '@gravity-ui/icons';
import React from 'react';

export const getIconByStatus = (status: TestStatus): React.JSX.Element => {
    if (status === TestStatus.FAIL || status === TestStatus.ERROR) {
        return <CircleXmark className={'icon-fail'} />;
    } else if (status === TestStatus.SUCCESS) {
        return <CircleCheck className={'icon-success'} />;
    } else if (status === TestStatus.SKIPPED) {
        return <CircleMinus className={'icon-skip'} />;
    }

    return <CircleDashed />;
};

export const getFullTitleByTitleParts = (titleParts: string[]): string => {
    const DELIMITER = ' ';

    return titleParts.join(DELIMITER).trim();
};
