import React, {ReactNode, useEffect, useState} from 'react';
import classNames from 'classnames';
import {ChevronsCollapseVertical, ChevronsExpandVertical, FileText, ChevronDown} from '@gravity-ui/icons';
import {Button, ClipboardButton, Dialog, Icon} from '@gravity-ui/uikit';

import {LocalStorageKey, TESTPLANE_CONFIG_BREAK_LINES, TESTPLANE_CONFIG_EXPAND_ALL, Theme} from '@/constants';
import {CodeActions} from '@/static/new-ui/components/CodeActions';
import {PanelSection} from '@/static/new-ui/components/PanelSection';
import useLocalStorage from '@/static/hooks/useLocalStorage';
import styles from './index.module.css';

export interface ConfigSectionProps {
    config: Record<string, unknown>;
    configPath?: string;
}

const JSON_NEW_LINE_ESCAPE_REGEXP = /((?<!\\)(?:\\\\)*\\n)/g;

const wrapJsonStringNewLines = (value: string): ReactNode[] => {
    return value.split(JSON_NEW_LINE_ESCAPE_REGEXP).map((part, index) => (
        <React.Fragment key={index}>
            {index % 2 === 1 ? part.slice(0, -2) : part}
            {index % 2 === 1 && <br/>}
        </React.Fragment>
    ));
};

interface JsonNodeProps {
    name?: string;
    value: unknown;
    depth: number;
    areAllNestedExpanded: boolean;
    trailingComma?: boolean;
}

const JsonNode = ({name, value, depth, areAllNestedExpanded, trailingComma}: JsonNodeProps): ReactNode => {
    const [isExpanded, setIsExpanded] = useState(depth === 0 || areAllNestedExpanded);
    const indentationStyle = {'--json-indent': `${depth * 16}px`} as React.CSSProperties;
    const isArray = Array.isArray(value);
    const isObject = value !== null && typeof value === 'object';
    const entries = isArray
        ? value.map((nestedValue, index) => [String(index), nestedValue] as const)
        : isObject
            ? Object.entries(value)
            : [];
    const propertyName = name === undefined
        ? null
        : <><span className={styles.jsonKey}>{JSON.stringify(name)}</span>: </>;

    useEffect(() => {
        if (depth > 0) {
            setIsExpanded(areAllNestedExpanded);
        }
    }, [areAllNestedExpanded, depth]);

    if (isObject) {
        const openingBracket = isArray ? '[' : '{';
        const closingBracket = isArray ? ']' : '}';

        if (entries.length === 0) {
            return <div className={styles.jsonLine} style={indentationStyle}>
                {propertyName}{openingBracket}{closingBracket}{trailingComma && ','}
            </div>;
        }

        return <>
            <div className={styles.jsonLine} style={indentationStyle}>
                <button
                    type={'button'}
                    className={styles.expandButton}
                    title={isExpanded ? 'Collapse' : 'Expand'}
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    aria-expanded={isExpanded}
                    onClick={(): void => setIsExpanded(!isExpanded)}
                >
                    <Icon
                        data={ChevronDown}
                        size={12}
                        className={classNames(styles.expandIcon, {[styles.expandIconExpanded]: isExpanded})}
                    />
                </button>
                {propertyName}
                {isExpanded
                    ? openingBracket
                    : <button
                        type={'button'}
                        className={styles.collapsedValue}
                        title={'Expand'}
                        aria-label={'Expand'}
                        onClick={(): void => setIsExpanded(true)}
                    >
                        {openingBracket}…{closingBracket}
                    </button>}
                {!isExpanded && trailingComma && ','}
            </div>
            {isExpanded && <>
                {entries.map(([key, nestedValue], index) => <JsonNode
                    key={key}
                    name={isArray ? undefined : key}
                    value={nestedValue}
                    depth={depth + 1}
                    areAllNestedExpanded={areAllNestedExpanded}
                    trailingComma={index < entries.length - 1}
                />)}
                <div className={styles.jsonLine} style={indentationStyle}>
                    {closingBracket}{trailingComma && ','}
                </div>
            </>}
        </>;
    }

    const formattedValue = JSON.stringify(value) ?? String(value);
    let className = styles.jsonNull;

    if (typeof value === 'string') {
        className = styles.jsonString;
    } else if (typeof value === 'number') {
        className = styles.jsonNumber;
    } else if (typeof value === 'boolean') {
        className = styles.jsonBoolean;
    }

    return <div className={styles.jsonLine} style={indentationStyle}>
        {propertyName}
        <span className={className}>
            {typeof value === 'string' ? wrapJsonStringNewLines(formattedValue) : formattedValue}
        </span>
        {trailingComma && ','}
    </div>;
};

export function ConfigSection({config, configPath}: ConfigSectionProps): ReactNode {
    const [theme] = useLocalStorage(LocalStorageKey.Theme, Theme.Light);
    const [breakLines, setBreakLines] = useLocalStorage(TESTPLANE_CONFIG_BREAK_LINES, false);
    const [areAllNestedExpanded, setAllNestedExpanded] = useLocalStorage(TESTPLANE_CONFIG_EXPAND_ALL, false);
    const [isOpen, setIsOpen] = useState(false);
    const formattedConfig = JSON.stringify(config, null, 2);

    return <>
        <PanelSection
            title={'Testplane config'}
            description={'Testplane configuration explicitly specified by the user.'}
        >
            <Button className={'regular-button'} onClick={(): void => setIsOpen(true)} qa={'open-config-button'}>
                <Icon data={FileText}/>Open config
            </Button>
        </PanelSection>
        <Dialog
            open={isOpen}
            size={'l'}
            className={styles.dialog}
            modalClassName="config-modal"
            contentOverflow={'auto'}
            hasCloseButton={true}
            onClose={(): void => setIsOpen(false)}
        >
            <Dialog.Header caption={'Testplane config'}/>
            <Dialog.Body>
                {configPath && <div className={styles.configPath}>
                    <span>Config path:</span> <code>{configPath}</code>
                    <ClipboardButton size={'xs'} text={configPath} qa={'copy-config-path'}/>
                </div>}
                <div className={classNames(styles.container, styles[theme])}>
                    <CodeActions
                        className={styles.buttons}
                        buttonClassName={styles.button}
                        clipboardText={formattedConfig}
                        clipboardQa={'copy-config'}
                        lineWrappingEnabled={breakLines}
                        onToggleLineWrapping={(): void => setBreakLines(!breakLines)}
                        extraButton={<Button
                            className={styles.button}
                            view={'flat'}
                            size={'m'}
                            title={areAllNestedExpanded ? 'Collapse all' : 'Expand all'}
                            onClick={(): void => setAllNestedExpanded(!areAllNestedExpanded)}
                        >
                            <Button.Icon>
                                <Icon data={areAllNestedExpanded ? ChevronsCollapseVertical : ChevronsExpandVertical}/>
                            </Button.Icon>
                        </Button>}
                    />
                    <div className={classNames(styles.config, {[styles.breakLines]: breakLines})} data-qa={'tool-config'}>
                        <JsonNode value={config} depth={0} areAllNestedExpanded={areAllNestedExpanded}/>
                    </div>
                </div>
            </Dialog.Body>
        </Dialog>
    </>;
}
