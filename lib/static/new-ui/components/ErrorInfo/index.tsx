import ansiHtml from 'ansi-html-community';
import classNames from 'classnames';
import escapeHtml from 'escape-html';
import React, {ReactNode, useMemo, useState} from 'react';
import {ClipboardButton, Button} from '@gravity-ui/uikit';

import styles from './index.module.css';
import stringify from 'json-stringify-safe';
import WordWrapIcon from '@/static/icons/word-wrap-icon.svg';

interface ErrorInfoProps {
    name: unknown;
    stack?: string;
    className?: string;
    style?: React.CSSProperties;
}

export function ErrorInfo(props: ErrorInfoProps): ReactNode {
    const [breakLines, setBreakLines] = useState(false);

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
    const errorText = useMemo(() => (
        escapeHtml(errorName + '\n' + props.stack)
    ), [errorName, props.stack]);

    return (
        <div className={classNames(styles.container, props.className)} style={props.style}>
            <div className={styles.buttons}>
                <ClipboardButton className={styles.button} text={errorText} hasTooltip={false} />
                <Button
                    className={styles.button}
                    view="flat"
                    size="m"
                    onClick={(): void => setBreakLines(!breakLines)}
                >
                    <Button.Icon>
                        <img src={WordWrapIcon} width={16} height={16} alt=""/>
                    </Button.Icon>
                </Button>
            </div>
            <div className={classNames(styles.code, {[styles.breakLines]: breakLines})} dangerouslySetInnerHTML={{__html: ansiHtml(errorText)}} />
        </div>
    );
}
