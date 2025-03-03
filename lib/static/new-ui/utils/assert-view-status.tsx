import {ImageEntity, ImageEntityError} from '@/static/new-ui/types/store';
import {Icon} from '@gravity-ui/uikit';
import {
    ArrowRightArrowLeft,
    CircleCheck,
    FileArrowUp, FileCheck,
    FileExclamation,
    FileLetterX,
    FilePlus,
    SquareExclamation,
    SquareXmark
} from '@gravity-ui/icons';
import {TestStatus} from '@/constants';
import {isInvalidRefImageError, isNoRefImageError} from '@/common-utils';
import React, {ReactNode} from 'react';

export const getAssertViewStatusIcon = (image: ImageEntity | null): ReactNode => {
    if (image === null) {
        return <Icon data={SquareExclamation} width={16}/>;
    } else if (isNoRefImageError((image as ImageEntityError).error)) {
        return <Icon data={FileLetterX} width={16}/>;
    } else if (isInvalidRefImageError((image as ImageEntityError).error)) {
        return <Icon data={FileExclamation} width={16}/>;
    }

    switch (image.status) {
        case TestStatus.SUCCESS:
            return <Icon data={CircleCheck} width={16}/>;
        case TestStatus.STAGED:
            return <Icon data={FilePlus} width={16}/>;
        case TestStatus.COMMITED:
            return <Icon data={FileArrowUp} width={16}/>;
        case TestStatus.FAIL:
            return <Icon data={ArrowRightArrowLeft} width={16}/>;
        case TestStatus.UPDATED:
            return <Icon data={FileCheck} width={16}/>;
    }

    return <Icon data={SquareXmark} width={16}/>;
};

export const getAssertViewStatusMessage = (image: ImageEntity | null): string => {
    if (image === null) {
        return 'Image is absent';
    } else if (isNoRefImageError((image as ImageEntityError).error)) {
        return 'Reference not found';
    } else if (isInvalidRefImageError((image as ImageEntityError).error)) {
        return 'Reference is broken';
    }

    switch (image.status) {
        case TestStatus.SUCCESS:
            return 'Images match';
        case TestStatus.STAGED:
            return 'Image is staged';
        case TestStatus.COMMITED:
            return 'Image was committed';
        case TestStatus.FAIL:
            return 'Difference detected';
        case TestStatus.UPDATED:
            return 'Reference updated';
    }

    return 'Failed to compare';
};
