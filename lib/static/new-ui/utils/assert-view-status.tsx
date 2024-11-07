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
    } else if (image.status === TestStatus.SUCCESS) {
        return <Icon data={CircleCheck} width={16}/>;
    } else if (image.status === TestStatus.STAGED) {
        return <Icon data={FilePlus} width={16}/>;
    } else if (image.status === TestStatus.COMMITED) {
        return <Icon data={FileArrowUp} width={16}/>;
    } else if (isNoRefImageError((image as ImageEntityError).error)) {
        return <Icon data={FileLetterX} width={16}/>;
    } else if (isInvalidRefImageError((image as ImageEntityError).error)) {
        return <Icon data={FileExclamation} width={16}/>;
    } else if (image.status === TestStatus.FAIL) {
        return <Icon data={ArrowRightArrowLeft} width={16}/>;
    } else if (image.status === TestStatus.UPDATED) {
        return <Icon data={FileCheck} width={16}/>;
    }

    return <Icon data={SquareXmark} width={16}/>;
};

export const getAssertViewStatusMessage = (image: ImageEntity | null): string => {
    if (image === null) {
        return 'Image is absent';
    } else if (image.status === TestStatus.SUCCESS) {
        return 'Images match';
    } else if (image.status === TestStatus.STAGED) {
        return 'Image is staged';
    } else if (image.status === TestStatus.COMMITED) {
        return 'Image was committed';
    } else if (isNoRefImageError((image as ImageEntityError).error)) {
        return 'Reference not found';
    } else if (isInvalidRefImageError((image as ImageEntityError).error)) {
        return 'Reference is broken';
    } else if (image.status === TestStatus.FAIL) {
        return 'Difference detected';
    } else if (image.status === TestStatus.UPDATED) {
        return 'Reference updated';
    }

    return 'Failed to compare';
};
