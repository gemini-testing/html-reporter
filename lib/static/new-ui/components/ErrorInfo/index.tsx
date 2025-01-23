import ansiHtml from 'ansi-html-community';
import classNames from 'classnames';
import escapeHtml from 'escape-html';
import React, {ReactNode} from 'react';

import styles from './index.module.css';

interface ErrorInfoProps {
    name: string;
    stack?: string;
    className?: string;
    style?: React.CSSProperties;
}

export function ErrorInfo(props: ErrorInfoProps): ReactNode {
    ansiHtml.setColors({
        reset: ['eee', '00000000']
    });

    return <div className={classNames(styles.code, props.className)} style={props.style} dangerouslySetInnerHTML={{__html: ansiHtml(escapeHtml(props.name + '\n' + props.stack))}}></div>;
}
