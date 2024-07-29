import React, {ChangeEvent, useCallback, useEffect, useMemo, memo} from 'react';
import {SplitViewLayout} from '../../layouts/SplitViewLayout';
import {Flex, TextInput} from '@gravity-ui/uikit';
import {StatusFilter} from './StatusFilter';

import {connect} from 'react-redux';
import {AutoSizer, CellMeasurer, CellMeasurerCache} from 'react-virtualized';
import {VariableSizeList as List} from 'react-window';
import {
    unstable_useList as useList,
    unstable_ListContainerView as ListContainerView,
    unstable_ListItemView as ListItemView,
    unstable_getItemRenderState as getItemRenderState,
    unstable_getListItemClickHandler as getListItemClickHandler,
    // unstable_useListFilter as useListFilter,
} from '@gravity-ui/uikit/unstable';
import ResizeObserver from 'rc-resize-observer';

import styles from './index.module.css';
import {useVirtualizer} from '@tanstack/react-virtual';

interface SuitesPageInternalProps {
    suites: any;
    browsers: any;
}

function ListItem({key, measure, style, props,}: any) {
    return <div
        key={key}
        style={style} className="virtualized__row">
        <ResizeObserver onResize={measure}>
            <ListItemView
                className={styles.treeView} {...props} />
        </ResizeObserver>
    </div>;
}

function ListViewProxy(props) {
    console.log('re-render!');
    console.log(props);

    useEffect(() => {
        return () => {
            console.log('list item unmounts...');
        }
    }, []);

    return <ListItemView {...props} />;
}

const ListItemViewMemo = memo(ListViewProxy, (...args) => {
    // console.log('memo:');
    // console.log(args);
    return true;
});

function SuitesPageInternal(props: SuitesPageInternalProps): JSX.Element {
    console.log(props);
    //
    // const formatBrowser = (browserData: any, parentSuite: any) => {
    //     const data = {title: browserData.name, fullTitle: (parentSuite.fullTitle + ' ' + browserData.name).trim()};
    //     if (browserData.parentId === 'describe (hey) some-it') {
    //         return {
    //             data,
    //             children: [{
    //                 data: {title: 'pic',
    //                     subtitle: <span>wow<br/>omg<br/>just to be sure!<img
    //                         src={'https://files.messenger.yandex-team.ru/file_shortterm/file/87d9457f-28bb-4ada-9649-4c4e798fecdf?size=middle-2048'}/></span>,
    //                     fullTitle: (parentSuite.fullTitle + ' ' + browserData.name).trim()
    //                 }
    //             }]
    //         };
    //     } else {
    //         return {data};
    //     }
    // };
    //
    // const formatSuite = (suiteData: any, parentSuite: any) => {
    //     const data = {title: suiteData.name, fullTitle: (parentSuite.fullTitle + ' ' + suiteData.name).trim()};
    //     if (suiteData.browserIds) {
    //         return {
    //             data,
    //             children: suiteData.browserIds.map((browserId: any) => formatBrowser(props.browsers.byId[browserId], data))
    //         };
    //     } else {
    //         return {
    //             data,
    //             children: suiteData.suiteIds.map((suiteId: any) => formatSuite(props.suites.byId[suiteId], data))
    //         };
    //     }
    // };
    //
    // const items = useMemo(() => props.suites.allRootIds.map((rootId: any) => {
    //     return {
    //         data: { title: rootId, fullTitle: rootId },
    //         children: props.suites.byId[rootId].suiteIds.map((suiteId: any) => formatSuite(props.suites.byId[suiteId], {fullTitle: rootId}))
    //     };
    // }), [props.suites]);
    //
    // const {onFilterUpdate, items: filteredItems} = useListFilter({
    //     items,
    //     filterItem(value: string, item: any): boolean {
    //         console.log('filtering! by ' + value);
    //         console.log(item);
    //
    //         return item.fullTitle.includes(value);
    //         // return true;
    //     },
    // })

    const itemsOriginal: any[] = useMemo(() => {
        const result = [] as any[];
        for (let i = 0; i < 200; i++) {
            const item = {data: {title: 'Some Title ' + i, fullTitle: 'Some-full-title ' + i},
                children: [
                    {data: {title: 'Child #' + i, fullTitle: 'full-child-title' + i}}
                ]};

            if (i === 50) {
                (item.children[0].data as any).subtitle = <div>Hello! <img src={'https://files.messenger.yandex-team.ru/file_shortterm/file/87d9457f-28bb-4ada-9649-4c4e798fecdf?size=middle-2048'}/></div>
            }

            result.push(item);
        }
        return result;
    }, []);

    const list = useList({items: itemsOriginal});
    // console.log(items);
    console.log(list);
    console.log('length:' + list.structure.items.length);

    const _suitesMeasurementCache = new CellMeasurerCache({
        fixedWidth: true,
        defaultHeight: 30
    });

    const onItemClick = getListItemClickHandler({list});

    const onChangeFilter = (value: ChangeEvent) => {
        console.log((value.target as any).value);
        // onFilterUpdate((value.target as any).value);
    };

    useEffect(() => {
        return () => {
            console.log('component unmounting!');
        };
    }, []);

    console.log('re-rendering the whole thing!!');
    const parentRef = React.useRef<HTMLDivElement>(null)

    const virtualizer = useVirtualizer({
        count: list.structure.visibleFlattenIds.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 45,
        getItemKey: useCallback((index) => list.structure.visibleFlattenIds[index], [list]),
        enabled: true,
        overscan: 25,
    });

    useEffect(() => {
        setTimeout(() => {
            console.log('scrolling tooooo !!');
            virtualizer.scrollToIndex(100, {align: 'start'});
        }, 2000);
    }, []);

    const items = virtualizer.getVirtualItems()

    return <SplitViewLayout>
        <div>
            <Flex direction={'column'} spacing={{p: '2'}} style={{height: '100vh'}}>
                <h2 className="text-display-1">Suites</h2>
                <div className={styles.controlsRow}>
                    <TextInput placeholder='Search or filter' onChange={onChangeFilter}/>
                </div>
                <div className={styles.controlsRow}>
                    <StatusFilter/>
                </div>
                <ListContainerView >
                    <div ref={parentRef} style={{
                        height: '100%',
                        width: '100%',
                        overflowY: 'auto',
                        contain: 'strict'
                        // background: 'red'
                    }}>
                        <div
                            style={{
                                height: virtualizer.getTotalSize(),
                                width: '100%',
                                position: 'relative'
                            }}
                        >
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    transform: `translateY(${items[0]?.start ?? 0}px)`
                                }}
                            >
                                {items.map((virtualRow) => (
                                    <div
                                        key={virtualRow.key}
                                        data-index={virtualRow.index}
                                        ref={virtualizer.measureElement}
                                        className={
                                            virtualRow.index % 2 ? 'ListItemOdd' : 'ListItemEven'
                                        }
                                    >
                                        <ListItemViewMemo key={virtualRow.key} {...getItemRenderState({
                                            qa: '',
                                            list: list,
                                            onItemClick,
                                            mapItemDataToProps: (x) => ({
                                                title: x.title,
                                                subtitle: x.subtitle
                                            }),
                                            size: 'm',
                                            // multiple: ,
                                            id: list.structure.visibleFlattenIds[virtualRow.index]
                                        }).props}/>
                                        {/*<div style={{padding: '10px 0'}}>
                                            <div>Row {virtualRow.index}</div>
                                            <div>{list.structure.items[virtualRow.index].data.title}</div>
                                        </div>*/}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    {/*<AutoSizer>
                        {({width, height}) => (
                            <List
                                overscanCount={10}
                                width={width}
                                height={height}
                                itemCount={list.structure.visibleFlattenIds.length}
                                itemData={{data: list, newId: list.structure.visibleFlattenIds}}
                                itemSize={(_index) => 30}
                                // rowHeight={_suitesMeasurementCache.rowHeight}
                            >
                                {({index, style, ...other}) => {
                                    console.log('other');
                                    console.log(index);
                                    console.log(style);
                                    console.log(parent);
                                    console.log(other);
                                    return (
                                        <CellMeasurer
                                            key={list.structure.visibleFlattenIds[index]}
                                            cache={_suitesMeasurementCache}
                                            parent={parent}
                                            columnIndex={0}
                                            rowIndex={index}
                                        >
                                            {({measure}) => {
                                                console.log('hey! debugging key!');
                                                console.log((list.structure.visibleFlattenIds[index] as any))

                                                return (
                                                    <ListItem key={list.structure.visibleFlattenIds[index]} style={style} measure={measure} props={getItemRenderState({
                                                        qa: '',
                                                        list: list,
                                                        onItemClick,
                                                        mapItemDataToProps: (x) => ({
                                                            title: x.title,
                                                            subtitle: x.subtitle
                                                        }),
                                                        size: 'm',
                                                        // multiple: ,
                                                        id: list.structure.visibleFlattenIds[index]
                                                    }).props}/>
                                                    // <div
                                                    //     key={list.structure.visibleFlattenIds[index]}
                                                    //     style={style} className="virtualized__row">
                                                    //     <ResizeObserver onResize={measure}>
                                                    //         <ListItemView
                                                    //             className={styles.treeView} {...getItemRenderState({
                                                    //             qa: '',
                                                    //             list: list,
                                                    //             onItemClick,
                                                    //             mapItemDataToProps: (x) => ({
                                                    //                 title: x.title,
                                                    //                 subtitle: x.subtitle
                                                    //             }),
                                                    //             size: 'm',
                                                    //             // multiple: ,
                                                    //             id: list.structure.visibleFlattenIds[index]
                                                    //         }).props as any} />
                                                    //     </ResizeObserver>
                                                    // </div>
                                                );
                                            }}
                                        </CellMeasurer>
                                        // <div style={style} key={index} className="testing-1">
                                        //
                                        //
                                        // </div>
                                    );
                                }}
                            </List>
                        )}
                    </AutoSizer>*/}
                </ListContainerView>
            </Flex>
        </div>
        <div></div>
    </SplitViewLayout>;
}

// export default connect(
//     (state) => {
//         return {
//             processing: state.processing,
//             acceptableOpenedImageIds: getAcceptableOpenedImageIds(state),
//             isStaticImageAccepterEnabled: state.staticImageAccepter.enabled,
//         };
//     },
//     (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
// )(AcceptOpenedButton);

export const SuitesPage = connect(
    (state: any) => ({
        suites: state.tree.suites,
        browsers: state.tree.browsers,
    })
)(SuitesPageInternal);
