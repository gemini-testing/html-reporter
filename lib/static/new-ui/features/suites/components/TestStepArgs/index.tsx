import classNames from 'classnames';
import React, {ReactNode, useState, useEffect} from 'react';
import {Icon} from '@gravity-ui/uikit';
import {Copy, CopyCheck} from '@gravity-ui/icons';

import styles from './index.module.css';
import {stringify} from '@/static/new-ui/utils';

interface TestStepArgsProps {
    args: string[];
    isFailed?: boolean;
    isActive?: boolean;
}

interface ArgItemProps {
    className: string;
    value: string;
}

function truncate(value: string, maxLen: number): string {
    if (value.length <= maxLen) {
        return value;
    }

    return `${value.slice(0, maxLen - 3)}...`;
}

const ArgItem = ({className, value}: ArgItemProps): ReactNode => {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        if (copied) {
            timeoutId = setTimeout(() => setCopied(false), 500);
        }

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [copied]);

    return (
        <span
            className={className}
            onClick={async (e): Promise<void> => {
                e.stopPropagation();
                await navigator.clipboard.writeText(value);
                setCopied(true);
            }}
        >
            {truncate(value, 50)}
            <span className={styles.copy}>
                <Icon data={copied ? CopyCheck : Copy}/>
            </span>
        </span>
    );
};

export function TestStepArgs(props: TestStepArgsProps): ReactNode {
    if (props.args.length === 0) {
        return null;
    }

    const itemClassName = classNames([styles.item, {
        [styles['item--failed']]: !props.isActive && props.isFailed
    }]);

    return (
        <div className={styles.wrapper}>
            {props.args.map((arg, index) => (
                <ArgItem key={index} className={itemClassName} value={stringify(arg)} />
            ))}
        </div>
    );
}
