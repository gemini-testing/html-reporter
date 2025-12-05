import {Button, Flex, Icon, Select, SelectRenderControlProps, SelectRenderOption} from '@gravity-ui/uikit';
import {ChevronDown} from '@gravity-ui/icons';
import React, {ReactNode, Ref, useCallback, useMemo} from 'react';

import styles from './index.module.css';
import {BrowserIcon} from '@/static/new-ui/components/BrowsersSelect/BrowserIcon';

interface BrowserSelectProps {
    availableBrowsers: {id: string; name: string}[];
    currentBrowserId: string | null;
    onBrowserChange: (browserId: string) => void;
}

export function BrowserSelect(props: BrowserSelectProps): ReactNode {
    const {availableBrowsers, currentBrowserId, onBrowserChange} = props;

    const onUpdate = useCallback((values: string[]): void => {
        const newBrowserId = values[0];
        if (newBrowserId && newBrowserId !== currentBrowserId) {
            onBrowserChange(newBrowserId);
        }
    }, [currentBrowserId, onBrowserChange]);

    const browserOptions = useMemo(() =>
        availableBrowsers.map(browser => ({
            value: browser.id,
            content: browser.name,
            data: {name: browser.name}
        })),
    [availableBrowsers]);

    const renderControl = useCallback(({ref, triggerProps: {onClick, onKeyDown}}: SelectRenderControlProps<HTMLElement>): React.JSX.Element => {
        const selectedBrowser = availableBrowsers.find(b => b.id === currentBrowserId);
        return (
            <div className={styles.browserSelectSizer}>
                {/* Hidden buttons to establish the width of the widest option */}
                {availableBrowsers.map(browser => (
                    <Button
                        key={browser.id}
                        view={'outlined'}
                        className={styles.browserSelectHidden}
                        tabIndex={-1}
                    >
                        <Flex gap={1} alignItems="center" className={styles.browserSelectContent}>
                            <Flex gap={1} alignItems="center">
                                <BrowserIcon name={browser.name} />
                                <span className={styles.browserName}>{browser.name}</span>
                            </Flex>
                            <Icon data={ChevronDown} size={16} />
                        </Flex>
                    </Button>
                ))}
                {/* Actual browser name and icon */}
                <Button
                    ref={ref as Ref<HTMLButtonElement>}
                    onClick={onClick}
                    onKeyDown={onKeyDown}
                    view={'outlined'}
                >
                    <Flex gap={1} alignItems="center" className={styles.browserSelectContent}>
                        <Flex gap={1} alignItems="center">
                            <BrowserIcon name={selectedBrowser?.name ?? ''} />
                            <span className={styles.browserName}>{selectedBrowser?.name ?? ''}</span>
                        </Flex>
                        <Icon data={ChevronDown} size={16} />
                    </Flex>
                </Button>
            </div>
        );
    }, [availableBrowsers, currentBrowserId]);

    const renderOption: SelectRenderOption<{name: string}> = useCallback((option) => (
        <Flex alignItems="center" gap={2}>
            <Flex height={16} width={16} alignItems={'center'} justifyContent={'center'}>
                <BrowserIcon name={option.data?.name ?? ''} />
            </Flex>
            <span>{option.content}</span>
        </Flex>
    ), []);

    if (availableBrowsers.length === 0) {
        return null;
    }

    return (
        <Select
            value={currentBrowserId ? [currentBrowserId] : []}
            onUpdate={onUpdate}
            renderControl={renderControl}
            renderOption={renderOption}
            disablePortal
        >
            {browserOptions.map(option => (
                <Select.Option key={option.value} value={option.value} content={option.content} data={option.data} />
            ))}
        </Select>
    );
}

