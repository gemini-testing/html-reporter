import ansiHtml from 'ansi-html-community';
import classNames from 'classnames';
import escapeHtml from 'escape-html';
import React, {ReactNode, useMemo} from 'react';
import stripAnsi from 'strip-ansi';

import styles from './index.module.css';
import stringify from 'json-stringify-safe';
import {CodeActions} from '@/static/new-ui/components/CodeActions';
import useLocalStorage from '@/static/hooks/useLocalStorage';
import {ERROR_BREAK_LINES} from '@/constants';

interface ErrorInfoProps {
    name: unknown;
    stack?: string;
    className?: string;
    style?: React.CSSProperties;
}

export function ErrorInfo(props: ErrorInfoProps): ReactNode {
    const [breakLines, setBreakLines] = useLocalStorage(ERROR_BREAK_LINES, false);

    ansiHtml.setColors({
        reset: ['eee', '00000000']
    });

    // ANSI "inverse" (code 7) is used to highlight the differing characters in a diff. Its default
    // rendering (transparent text on a light background) is unreadable on the dark report background,
    // so we make the differing part inherit the surrounding color and just render it bold instead.
    ansiHtml.tags.open['7'] = 'font-weight:bold';

    let errorName = props.name;

    if (typeof errorName !== 'string') {
        try {
            errorName = stringify(errorName);
        } catch {
            errorName = String(errorName);
        }
    }
    const rawErrorText = useMemo(() => errorName + '\n' + props.stack, [errorName, props.stack]);
    const errorText = useMemo(() => escapeHtml(rawErrorText), [rawErrorText]);
    const clipboardText = useMemo(() => stripAnsi(rawErrorText), [rawErrorText]);

    return (
        <div className={classNames(styles.container, props.className)} style={props.style}>
            <CodeActions
                className={styles.buttons}
                buttonClassName={styles.button}
                clipboardText={clipboardText}
                lineWrappingEnabled={breakLines}
                onToggleLineWrapping={(): void => setBreakLines(!breakLines)}
            />
            <div className={classNames(styles.code, {[styles.breakLines]: breakLines})} dangerouslySetInnerHTML={{__html: ansiHtml(errorText)}} />
        </div>
    );
}
