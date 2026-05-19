import ansiHtml from 'ansi-html-community';
import classNames from 'classnames';
import escapeHtml from 'escape-html';
import React, {ReactNode} from 'react';

import styles from './index.module.css';
import stringify from 'json-stringify-safe';

interface ErrorInfoProps {
    name: unknown;
    stack?: string;
    className?: string;
    style?: React.CSSProperties;
}

export function ErrorInfo(props: ErrorInfoProps): ReactNode {
    ansiHtml.setColors({
        reset: ['eee', '00000000']
    });

    let errorName = props.name;

    if (typeof errorName !== 'string') {
        try {
            errorName = stringify(errorName);
        } catch {
            errorName = String(errorName);
        }
    }

    return <div className={classNames(styles.code, props.className)} style={props.style} dangerouslySetInnerHTML={{__html: ansiHtml(escapeHtml(errorName + '\n' + props.stack))}}></div>;
}
