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
    switch (status) {
        case TestStatus.FAIL:
        case TestStatus.ERROR:
            return <CircleXmark className={'icon-fail'} />;

        case TestStatus.SUCCESS:
            return <CircleCheck className={'icon-success'} />;

        case TestStatus.SKIPPED:
            return <CircleMinus className={'icon-skip'} />;

        case TestStatus.RETRY:
            return <ArrowRotateLeft className={'icon-retry'} />;

        case TestStatus.UPDATED:
        case TestStatus.STAGED:
            return <ArrowsRotateLeft className={'icon-updated'} />;

        case TestStatus.RUNNING:
            return <Spin size={'xs'} />;

        case TestStatus.COMMITED:
            return <CloudCheck className={'icon-committed'} />;

        default:
            return <CircleDashed />;
    }
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
