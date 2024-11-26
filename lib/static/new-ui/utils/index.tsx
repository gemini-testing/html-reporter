import {
    ArrowRotateLeft,
    ArrowsRotateLeft,
    CircleCheck,
    CircleDashed,
    CircleMinus,
    CircleXmark,
    CloudCheck
} from '@gravity-ui/icons';
import {Spin} from '@gravity-ui/uikit';
import React, {ReactNode} from 'react';

import {TestStatus} from '@/constants';
import {ImageFile} from '@/types';
import {isNull, isObject, isString, isUndefined, toString} from 'lodash';

export const getIconByStatus = (status: TestStatus): React.JSX.Element => {
    if (status === TestStatus.FAIL || status === TestStatus.ERROR) {
        return <CircleXmark className={'icon-fail'} />;
    } else if (status === TestStatus.SUCCESS) {
        return <CircleCheck className={'icon-success'} />;
    } else if (status === TestStatus.SKIPPED) {
        return <CircleMinus className={'icon-skip'} />;
    } else if (status === TestStatus.RETRY) {
        return <ArrowRotateLeft className={'icon-retry'}/>;
    } else if (status === TestStatus.UPDATED || status === TestStatus.STAGED) {
        return <ArrowsRotateLeft className={'icon-updated'}/>;
    } else if (status === TestStatus.RUNNING) {
        return <Spin size={'xs'} />;
    } else if (status === TestStatus.COMMITED) {
        return <CloudCheck className={'icon-committed'} />;
    }

    return <CircleDashed />;
};

export const getImageDisplayedSize = (image: ImageFile): string => `${image.size.width}×${image.size.height}`;

export const stringify = (value: unknown): string => {
    if (isString(value)) {
        return value;
    }

    if (isObject(value)) {
        return JSON.stringify(value);
    }

    if (isNull(value)) {
        return 'null';
    }

    if (isUndefined(value)) {
        return 'undefined';
    }

    return toString(value);
};

export const makeLinksClickable = (text: string): React.JSX.Element => {
    const urlRegex = /https?:\/\/[^\s]*/g;

    const parts = text.split(urlRegex);
    const urls = text.match(urlRegex) || [];

    return <>{
        parts.reduce((elements, part, index) => {
            elements.push(part);

            if (urls[index]) {
                const href = urls[index].startsWith('www.')
                    ? `http://${urls[index]}`
                    : urls[index];

                elements.push(
                    <a
                        key={index}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {urls[index]}
                    </a>
                );
            }

            return elements;
        }, [] as ReactNode[])
    }</>;
};
