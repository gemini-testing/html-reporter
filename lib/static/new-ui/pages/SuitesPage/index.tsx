import React, {useMemo} from 'react';
import {SplitViewLayout} from '../../layouts/SplitViewLayout';
import {Flex} from '@gravity-ui/uikit';
import {StatusFilter} from './StatusFilter';

import {connect} from 'react-redux';
import {AutoSizer, CellMeasurer, CellMeasurerCache, List} from 'react-virtualized';
// import {VariableSizeList} from 'react-window';
import {
    unstable_useList as useList,
    unstable_ListContainerView as ListContainerView,
    unstable_ListItemView as ListItemView,
    unstable_getItemRenderState as getItemRenderState,
    unstable_getListItemClickHandler as getListItemClickHandler,
} from '@gravity-ui/uikit/unstable';
import ResizeObserver from 'rc-resize-observer';

interface SuitesPageInternalProps {
    suites: any;
    browsers: any;
}

function SuitesPageInternal(props: SuitesPageInternalProps): JSX.Element {
    console.log(props.suites);

    const formatBrowser = (browserData: any) => {
        if (browserData.parentId === 'describe (hey) some-it') {
            return {
                data: {title: browserData.name},
                children: [{
                    data: {title: 'pic', subtitle: <span>wow<br/>omg<br/>just to be sure!</span>},
                    children: []
                }]
            };
        } else {
            return {data: {title: browserData.name}, children: []};
        }
    };

    const formatSuite = (suiteData: any) => {
        if (suiteData.browserIds) {
            return {
                data: {title: suiteData.name},
                children: suiteData.browserIds.map((browserId: any) => formatBrowser(props.browsers.byId[browserId])),
            };
        } else {
            return {
                data: {title: suiteData.name},
                children: suiteData.suiteIds.map((suiteId: any) => formatSuite(props.suites.byId[suiteId]))
            };
        }
    };

    const items = useMemo(() => props.suites.allRootIds.map((rootId: any) => {
        return {
            data: { title: rootId },
            children: props.suites.byId[rootId].suiteIds.map((suiteId: any) => formatSuite(props.suites.byId[suiteId]))
        };
    }), [props.suites]);

    const list = useList({items});
    console.log(items);
    console.log(list);

    const _suitesMeasurementCache = new CellMeasurerCache({
        fixedWidth: true,
        defaultHeight: 30
    });

    const onItemClick = getListItemClickHandler({list});

    return <SplitViewLayout>
        <div>
            <Flex direction={'column'} spacing={{p: '2'}} style={{height: '100vh'}}>
                <h2 className="text-display-1">Suites</h2>
                <StatusFilter/>
                <ListContainerView>
                    <AutoSizer>
                        {({width, height}) => (
                            <List
                                overscanCount={10}
                                width={width}
                                height={height}
                                rowCount={list.structure.visibleFlattenIds.length}
                                itemData={list.structure.visibleFlattenIds}
                                // itemSize={(_index) => 30}
                                rowRenderer={({index, key, style, parent}) => {
                                    // console.log(getItemRenderState({
                                    //     qa: '',
                                    //     list: list,
                                    //     onItemClick: () => {},
                                    //     mapItemDataToProps: (x) => x as any,
                                    //     size: 'm',
                                    //     // multiple: ,
                                    //     id: data[index],
                                    // }));

                                    return (
                                        <CellMeasurer
                                            key={key}
                                            cache={_suitesMeasurementCache}
                                            parent={parent}
                                            columnIndex={0}
                                            rowIndex={index}
                                        >
                                            {({measure}) => (
                                                <div key={key} style={style} className="virtualized__row">
                                                    <ResizeObserver onResize={measure}>
                                                        <ListItemView {...getItemRenderState({
                                                            qa: '',
                                                            list: list,
                                                            onItemClick,
                                                            mapItemDataToProps: (x) => x as any,
                                                            size: 'm',
                                                            // multiple: ,
                                                            id: list.structure.visibleFlattenIds[index]
                                                        }).props as any} />
                                                    </ResizeObserver>
                                                </div>
                                            )}
                                        </CellMeasurer>
                                        // <div style={style} key={index} className="testing-1">
                                        //
                                        //
                                        // </div>
                                    );
                                }}
                                rowHeight={_suitesMeasurementCache.rowHeight}
                            />
                        )}
                    </AutoSizer>
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
