import {Globe} from '@gravity-ui/icons';
import {Button, Flex, Select, SelectRenderControlProps, SelectRenderOption} from '@gravity-ui/uikit';
import React, {useState, useEffect, ReactNode} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import * as actions from '@/static/modules/actions';
import {BrowserIcon} from '@/static/new-ui/features/suites/components/BrowsersSelect/BrowserIcon';
import {State} from '@/static/new-ui/types/store';
import {BrowserItem} from '@/types';
import styles from './index.module.css';

// In the onUpdate callback we only have access to array of selected strings. That's why we need to serialize
// id/version in string. Encoding to avoid errors if id/version contains delimiter.
// The other approach would be to use mapping, but in practice it makes things even more complex.
const DELIMITER = '/';

const serializeBrowserData = (id: string, version: string): string =>
    `${encodeURIComponent(id)}${DELIMITER}${encodeURIComponent(version)}`;

const deserializeBrowserData = (data: string): {id: string; version: string} => {
    const [idEncoded, versionEncoded] = data.split(DELIMITER);
    return {id: decodeURIComponent(idEncoded), version: decodeURIComponent(versionEncoded)};
};

interface BrowsersSelectProps {
    browsers: BrowserItem[];
    filteredBrowsers: BrowserItem[];
    actions: typeof actions;
}

function BrowsersSelectInternal({browsers, filteredBrowsers, actions}: BrowsersSelectProps): ReactNode {
    const [selectedBrowsers, setSelectedBrowsers] = useState<BrowserItem[]>([]);

    useEffect(() => {
        setSelectedBrowsers(filteredBrowsers);
    }, [browsers, filteredBrowsers]);

    const renderFilter = (): React.JSX.Element => {
        return (
            <div className={styles['browserlist__filter']}>
                <Button onClick={(): void => setSelectedBrowsers(browsers)} width='max'>
                    Select All
                </Button>
            </div>
        );
    };

    const onUpdate = (values: string[]): void => {
        const selectedItems: BrowserItem[] = [];

        values.forEach(encodedBrowserData => {
            const {id, version} = deserializeBrowserData(encodedBrowserData);
            const existingBrowser = selectedItems.find(browser => browser.id === id);

            if (existingBrowser) {
                if (!existingBrowser.versions.includes(version)) {
                    existingBrowser.versions.push(version);
                }
            } else {
                selectedItems.push({id, versions: [version]});
            }
        });

        setSelectedBrowsers(selectedItems);
    };

    const renderOptions = (): React.JSX.Element | React.JSX.Element[] => {
        const browsersWithMultipleVersions = browsers.filter(browser => browser.versions.length > 1);
        const browsersWithSingleVersion = browsers.filter(browser => browser.versions.length === 1);

        if (browsersWithMultipleVersions.length === 0) {
            // If there are no browsers with multiple versions, we want to render a simple plain list
            return browsers.map(browser => (
                <Select.Option
                    key={serializeBrowserData(browser.id, browser.versions[0])}
                    value={serializeBrowserData(browser.id, browser.versions[0])}
                    content={browser.id}
                    data={{id: browser.id, version: browser.versions[0]}}
                />
            ));
        } else {
            // Otherwise render browser version groups and place all browsers with single version into "Other" group
            return (
                <>
                    {browsersWithMultipleVersions.map(browser => (
                        <Select.OptionGroup key={browser.id} label={browser.id}>
                            {browser.versions.map(version => (
                                <Select.Option
                                    key={serializeBrowserData(browser.id, version)}
                                    value={serializeBrowserData(browser.id, version)}
                                    content={`${browser.id} ${version}`}
                                    data={{id: browser.id, version}}
                                />
                            ))}
                        </Select.OptionGroup>
                    ))}
                    <Select.OptionGroup label="Other">
                        {browsersWithSingleVersion.map(browser => (
                            <Select.Option
                                key={serializeBrowserData(browser.id, browser.versions[0])}
                                value={serializeBrowserData(browser.id, browser.versions[0])}
                                content={browser.id}
                                data={{id: browser.id, version: browser.versions[0]}}
                            />
                        ))}
                    </Select.OptionGroup>
                </>
            );
        }
    };

    const renderControl = ({onClick, onKeyDown, ref}: SelectRenderControlProps): React.JSX.Element => {
        return <Button ref={ref} onClick={onClick} extraProps={{onKeyDown}} view={'outlined'} style={{width: 28}}>
            <Globe/>
        </Button>;
    };

    const selected = selectedBrowsers.flatMap(browser => browser.versions.map(version => serializeBrowserData(browser.id, version)));

    const onClose = (): void => {
        actions.selectBrowsers(selectedBrowsers);
    };

    const onFocus = (): void => {
        if (selected.length === 0) {
            setSelectedBrowsers(browsers);
        }
    };

    const renderOption: SelectRenderOption<{id: string; version: string}> = (option) => {
        const isTheOnlySelected = selected.includes(option.value) && selected.length === 1;
        const selectOnly = (e: React.MouseEvent<HTMLElement>): void => {
            e.preventDefault();
            e.stopPropagation();
            setSelectedBrowsers([{id: option.data?.id as string, versions: [option.data?.version as string]}]);
        };
        const selectExcept = (e: React.MouseEvent<HTMLElement>): void => {
            e.preventDefault();
            e.stopPropagation();
            setSelectedBrowsers(browsers.map(browser => ({
                id: browser.id,
                versions: browser.versions.filter(version => browser.id !== option.data?.id || version !== option.data?.version)
            })));
        };
        return (
            <Flex alignItems="center" width={'100%'} gap={2}>
                <Flex height={16} width={16} alignItems={'center'} justifyContent={'center'}><BrowserIcon name={option.data?.id as string} /></Flex>
                <div className="browser-name">{option.content}</div>
                <Button size="s" onClick={isTheOnlySelected ? selectExcept : selectOnly} className={styles.actionButton}>{isTheOnlySelected ? 'Except' : 'Only'}</Button>
            </Flex>
        );
    };

    return (
        <Select
            disablePortal
            value={selected}
            multiple={true}
            hasCounter
            filterable
            renderFilter={renderFilter}
            renderOption={renderOption}
            renderControl={renderControl}
            popupClassName={styles['browserlist__popup']}
            className='browserlist'
            onUpdate={onUpdate}
            onFocus={onFocus}
            onClose={onClose}
        >
            {renderOptions()}
        </Select>
    );
}

export const BrowsersSelect = connect(
    (state: State) => ({
        filteredBrowsers: state.view.filteredBrowsers,
        browsers: state.browsers
    }),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(BrowsersSelectInternal);
