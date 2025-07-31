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

export const getAssertViewStatusIcon = (image: ImageEntity | null): {
    icon: ReactNode;
    className: string;
} => {
    if (image === null) {
        return {
            icon: <Icon data={SquareExclamation} width={16}/>,
            className: 'icon-skip'
        };
    }

    if (isNoRefImageError((image as ImageEntityError).error)) {
        return {
            icon: <Icon data={FileLetterX} width={16}/>,
            className: 'icon-fail'
        };
    }

    if (isInvalidRefImageError((image as ImageEntityError).error)) {
        return {
            icon: <Icon data={FileExclamation} width={16}/>,
            className: 'icon-fail'
        };
    }

    switch (image.status) {
        case TestStatus.SUCCESS:
            return {
                icon: <Icon data={CircleCheck} width={16}/>,
                className: 'icon-success'
            };
        case TestStatus.STAGED:
            return {
                icon: <Icon data={FilePlus} width={16}/>,
                className: 'icon-success'
            };
        case TestStatus.COMMITED:
            return {
                icon: <Icon data={FileArrowUp} width={16}/>,
                className: 'icon-committed'
            };
        case TestStatus.FAIL:
            return {
                icon: <Icon data={ArrowRightArrowLeft} width={16}/>,
                className: 'icon-fail'
            };
        case TestStatus.UPDATED:
            return {
                icon: <Icon data={FileCheck} width={16}/>,
                className: 'icon-updated'
            };
    }

    return {
        icon: <Icon data={SquareXmark} width={16}/>,
        className: ''
    };
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
