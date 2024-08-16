import React from 'react';
import {createRoot} from 'react-dom/client';
import {Provider} from 'react-redux';
import store from './modules/store';
import Gui from './components/gui';
import {Button, Icon, RadioButton, Select, TextInput, ThemeProvider, Popover} from '@gravity-ui/uikit';
import {AsideHeader} from '@gravity-ui/navigation';
import TestplaneIcon from './icons/testplane.svg';

import Split from 'react-split';

import '@gravity-ui/uikit/styles/fonts.css';
import '@gravity-ui/uikit/styles/styles.css';

import {CircleDashed, SquareCheck, ListCheck, Eye, CircleInfo, Sliders, Check, Xmark, ArrowRotateLeft, BarsDescendingAlignLeftArrowDown, Layers3Diagonal, ChevronsExpandVertical, Globe, Ban, ArrowsRotateLeft, CloudCheck} from '@gravity-ui/icons';
import {unstable_ListContainerView as ListContainerView, unstable_ListItemView as ListItemView} from '@gravity-ui/uikit/unstable';
import {AutoSizer} from 'react-virtualized';
import {VariableSizeList} from 'react-window';

const rootEl = document.getElementById('app');
const root = createRoot(rootEl);

root.render(
    <ThemeProvider theme='light'>
        <Provider store={store}>
            <AsideHeader logo={{text: 'Testplane UI', iconSrc: TestplaneIcon, iconSize: 32}} compact={true} headerDecoration={true} menuItems={[
                {id: 'suites', title: 'Suites', icon: ListCheck, current: true},
                {id: 'visual-checks', title: 'Visual Checks', icon: Eye},
                {id: 'info', title: 'Info', icon: CircleInfo}
            ]} renderContent={
                (...args) => {
                    console.log(args);
                    const treeItems = [
                        {id: 'id-1', title: 'hey'},
                        {id: 'id-2', title: 'hey2'}
                    ];

                    return <Split direction={'horizontal'} className={'split'} minSize={0} snapOffset={300}>
                        <div>
                            <div className='controls'>
                                <div className="controls-row">
                                    <h2 className="controls-row__heading text-display-1">Suites</h2>
                                    <div>
                                        <Popover placement={'bottom-end'} hasArrow={false} content={
                                            <div>
                                                <h4 className={'text-subheader-3'}>Options</h4>
                                                <TextInput label={'Base URL'} placeholder={'https://example.com'}></TextInput>
                                            </div>
                                        } openOnHover={false}><Button view={'flat'}><Icon data={Sliders} size={16}/></Button></Popover>
                                        <Select
                                            popupPlacement={['bottom-end']}
                                            renderControl={({onClick, onKeyDown, ref}) => {
                                                return (
                                                    <Button
                                                        ref={ref}
                                                        view="flat"
                                                        onClick={onClick}
                                                        extraProps={{
                                                            onKeyDown
                                                        }}
                                                    >
                                                        <Icon data={BarsDescendingAlignLeftArrowDown} size={16}/>
                                                    </Button>
                                                );
                                            }}
                                        >
                                            <Select.Option value="val1" content="Value1" />
                                            <Select.Option value="val2" content="Value2" />
                                            <Select.Option value="val3" content="Value3" />
                                            <Select.Option value="val4" content="Value4" />
                                            <Select.Option value="val5" content="Some long value" />
                                        </Select>
                                        <Select
                                            popupPlacement={['bottom-end']}
                                            renderControl={({onClick, onKeyDown, ref}) => {
                                                return (
                                                    <Button
                                                        ref={ref}
                                                        view="flat"
                                                        onClick={onClick}
                                                        extraProps={{
                                                            onKeyDown
                                                        }}
                                                    >
                                                        <Icon data={Layers3Diagonal} size={16}/>
                                                    </Button>
                                                );
                                            }}
                                        >
                                            <Select.Option value="val1" content="Value1" />
                                            <Select.Option value="val2" content="Value2" />
                                            <Select.Option value="val3" content="Value3" />
                                            <Select.Option value="val4" content="Value4" />
                                            <Select.Option value="val5" content="Some long value" />
                                        </Select>
                                        <Select
                                            popupPlacement={['bottom-end']}
                                            renderControl={({onClick, onKeyDown, ref}) => {
                                                return (
                                                    <Button
                                                        ref={ref}
                                                        view="flat"
                                                        onClick={onClick}
                                                        extraProps={{
                                                            onKeyDown
                                                        }}
                                                    >
                                                        <Icon data={SquareCheck} size={16}/>
                                                    </Button>
                                                );
                                            }}
                                        >
                                            <Select.Option value="val1" content="Value1" />
                                            <Select.Option value="val2" content="Value2" />
                                            <Select.Option value="val3" content="Value3" />
                                            <Select.Option value="val4" content="Value4" />
                                            <Select.Option value="val5" content="Some long value" />
                                        </Select>
                                        <Select
                                            popupPlacement={['bottom-end']}
                                            renderControl={({onClick, onKeyDown, ref}) => {
                                                return (
                                                    <Button
                                                        ref={ref}
                                                        view="flat"
                                                        onClick={onClick}
                                                        extraProps={{
                                                            onKeyDown
                                                        }}
                                                    >
                                                        <Icon data={ChevronsExpandVertical} size={16}/>
                                                    </Button>
                                                );
                                            }}
                                        >
                                            <Select.Option value="val1" content="Value1" />
                                            <Select.Option value="val2" content="Value2" />
                                            <Select.Option value="val3" content="Value3" />
                                            <Select.Option value="val4" content="Value4" />
                                            <Select.Option value="val5" content="Some long value" />
                                        </Select>
                                    </div>
                                </div>
                                <div className="controls-row">
                                    <TextInput placeholder={'Search and filter'}></TextInput>
                                    <Select
                                        popupPlacement={['bottom-end']}
                                        renderControl={({onClick, onKeyDown, ref}) => {
                                            return (
                                                <Button
                                                    ref={ref}
                                                    view="outlined"
                                                    onClick={onClick}
                                                    extraProps={{
                                                        onKeyDown
                                                    }}
                                                >
                                                    <Icon data={Globe} size={16}/>
                                                </Button>
                                            );
                                        }}
                                    >
                                        <Select.Option value="val1" content="Value1" />
                                        <Select.Option value="val2" content="Value2" />
                                        <Select.Option value="val3" content="Value3" />
                                        <Select.Option value="val4" content="Value4" />
                                        <Select.Option value="val5" content="Some long value" />
                                    </Select>
                                </div>
                                <div className="controls-row">
                                    <RadioButton className='status-switcher' width={'max'} options={[
                                        {value: 'all', content: <div className='status-switcher__option'><CircleDashed/><span>20,256</span></div>},
                                        {value: 'passed', content: <div className='status-switcher__option'><Check/><span>10,123</span></div>},
                                        {value: 'failed', content: <div className='status-switcher__option'><Xmark/><span>10,453</span></div>},
                                        {value: 'retried', content: <div className='status-switcher__option'><ArrowRotateLeft/><span>792</span></div>},
                                        {value: 'skipped', content: <div className='status-switcher__option'><Ban/><span>132</span></div>},
                                        {value: 'updated', content: <div className='status-switcher__option'><ArrowsRotateLeft/><span>256</span></div>},
                                        {value: 'commited', content: <div className='status-switcher__option'><CloudCheck/><span>10</span></div>}
                                    ]}></RadioButton>

                                </div>
                                <ListContainerView>
                                    <AutoSizer>
                                        {({width, height}) => (
                                            <VariableSizeList
                                                overscanCount={10}
                                                width={width}
                                                height={height}
                                                itemCount={treeItems.length}
                                                itemData={treeItems}
                                                itemSize={() => 30}
                                            >
                                                {({index, style, data}) => (
                                                    <div style={style} key={index} className='testing-1'>
                                                        <ListItemView id={index} title={JSON.stringify(data[index])} hasSelectionIcon={false} expanded={false} activeOnHover={true} />
                                                    </div>
                                                )}
                                            </VariableSizeList>
                                        )}
                                    </AutoSizer>
                                </ListContainerView>
                            </div>
                        </div>
                        <div>
                            <Gui/>
                        </div>
                    </Split>;
                }
            } hideCollapseButton={true} />
        </Provider>
    </ThemeProvider>
);
