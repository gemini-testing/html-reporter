import {Button, ClipboardButton} from '@gravity-ui/uikit';
import classNames from 'classnames';
import React, {ReactNode} from 'react';

import {TESTPLANE_CONFIG_BREAK_LINES} from '@/constants';
import {PanelSection} from '@/static/new-ui/components/PanelSection';
import useLocalStorage from '@/static/hooks/useLocalStorage';
import WordWrapIcon from '@/static/icons/word-wrap-icon.svg';
import styles from './index.module.css';

interface ConfigSectionProps {
    config: Record<string, unknown>;
}

const JSON_TOKEN_REGEXP = /("(?:\\.|[^"\\])*")(?=\s*:)|("(?:\\.|[^"\\])*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false)\b|\b(null)\b/g;

const highlightJson = (json: string): ReactNode[] => {
    const result: ReactNode[] = [];
    let lastIndex = 0;

    for (const match of json.matchAll(JSON_TOKEN_REGEXP)) {
        const index = match.index ?? 0;
        const className = match[1]
            ? styles.jsonKey
            : match[2]
                ? styles.jsonString
                : match[3]
                    ? styles.jsonNumber
                    : match[4]
                        ? styles.jsonBoolean
                        : styles.jsonNull;

        result.push(json.slice(lastIndex, index));
        result.push(<span className={className} key={index}>{match[0]}</span>);
        lastIndex = index + match[0].length;
    }

    result.push(json.slice(lastIndex));

    return result;
};

export function ConfigSection({config}: ConfigSectionProps): ReactNode {
    const [breakLines, setBreakLines] = useLocalStorage(TESTPLANE_CONFIG_BREAK_LINES, false);
    const formattedConfig = JSON.stringify(config, null, 2);

    return <PanelSection
        title={'Testplane config'}
        description={'Testplane configuration explicitly specified by the user.'}
    >
        <div className={styles.container}>
            <div className={styles.buttons}>
                <ClipboardButton className={styles.button} text={formattedConfig} hasTooltip={false}/>
                <Button
                    className={styles.button}
                    view={'flat'}
                    size={'m'}
                    title={'Toggle line wrapping'}
                    onClick={(): void => setBreakLines(!breakLines)}
                >
                    <Button.Icon>
                        <img src={WordWrapIcon} width={18} height={18} alt={''}/>
                    </Button.Icon>
                </Button>
            </div>
            <pre className={classNames(styles.config, {[styles.breakLines]: breakLines})}>{highlightJson(formattedConfig)}</pre>
        </div>
    </PanelSection>;
}
