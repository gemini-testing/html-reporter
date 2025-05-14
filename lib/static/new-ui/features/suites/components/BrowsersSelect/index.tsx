import {PlanetEarth} from '@gravity-ui/icons';
import {Button, Flex, Icon, Select, SelectRenderControlProps, SelectRenderOption} from '@gravity-ui/uikit';
import React, {useState, useEffect, ReactNode, Ref} from 'react';
import {connect, useSelector} from 'react-redux';
import {bindActionCreators} from 'redux';

import * as actions from '@/static/modules/actions';
import {BrowserIcon} from '@/static/new-ui/features/suites/components/BrowsersSelect/BrowserIcon';
import {getIsInitialized} from '@/static/new-ui/store/selectors';
import {BrowserItem} from '@/types';
import styles from './index.module.css';
import {IconButton} from '../../../../components/IconButton';

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

const IconsPreloader = (): React.JSX.Element => {
    const allBrowserIds = ['google', 'chrome', 'firefox', 'safari', 'edge', 'yandex', 'yabro', 'ie', 'explorer', 'opera', 'phone', 'mobile', 'tablet', 'ipad', 'browser'];
    return (
        <div style={{position: 'absolute', visibility: 'hidden', height: 0, width: 0, overflow: 'hidden'}}>
            {allBrowserIds.map(id => (
                <BrowserIcon key={id} name={id} />
            ))}
        </div>
    );
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

        const getOptionProps = (browser: BrowserItem, version: string): {value: string; content: string; data: Record<string, unknown>} => ({
            value: serializeBrowserData(browser.id, version),
            content: browser.id,
            data: {id: browser.id, version}
        });

        if (browsersWithMultipleVersions.length === 0) {
            // If there are no browsers with multiple versions, we want to render a simple plain list
            return browsers.map(browser => <Select.Option
                key={browser.id}
                {...getOptionProps(browser, browser.versions[0])}
            />);
        } else {
            // Otherwise render browser version groups and place all browsers with single version into "Other" group
            return (
                <>
                    {browsersWithMultipleVersions.map(browser => (
                        <Select.OptionGroup key={browser.id} label={browser.id}>
                            {browser.versions.map(version => (
                                <Select.Option
                                    key={version}
                                    {...getOptionProps(browser, version)}
                                />
                            ))}
                        </Select.OptionGroup>
                    ))}
                    <Select.OptionGroup label="Other">
                        {browsersWithSingleVersion.map(browser => (
                            <Select.Option
                                key={browser.id}
                                {...getOptionProps(browser, browser.versions[0])}
                            />
                        ))}
                    </Select.OptionGroup>
                </>
            );
        }
    };

    const isInitialized = useSelector(getIsInitialized);

    const renderControl = ({ref, triggerProps: {onClick, onKeyDown}}: SelectRenderControlProps<HTMLElement>): React.JSX.Element => {
        return <IconButton ref={ref as Ref<HTMLButtonElement>} onClick={onClick} onKeyDown={onKeyDown} view={'outlined'} disabled={!isInitialized} icon={<Icon data={PlanetEarth}/>} tooltip={'Filter by browser'} />;
    };

    const selected = selectedBrowsers.flatMap(browser => browser.versions.map(version => serializeBrowserData(browser.id, version)));

    const onClose = (): void => {
        actions.selectBrowsers(selectedBrowsers.filter(browser => browser.versions.length > 0));
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
        <>
            <IconsPreloader />
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
        </>
    );
}

export const BrowsersSelect = connect(
    state => ({
        filteredBrowsers: state.view.filteredBrowsers,
        browsers: state.browsers
    }),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(BrowsersSelectInternal);
