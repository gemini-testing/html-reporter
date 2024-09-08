import {
    unstable_ListContainerView as ListContainerView,
    unstable_ListTreeItemType as ListTreeItemType,
    unstable_useList as useList
} from '@gravity-ui/uikit/unstable';
import {Paperclip} from '@gravity-ui/icons';
import React, {ReactNode, useCallback} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {CollapsibleSection} from '@/static/new-ui/features/suites/components/CollapsibleSection';
import {State} from '@/static/new-ui/types/store';
import {TreeViewItemIcon} from '@/static/new-ui/components/TreeViewItemIcon';
import {TestStatus} from '@/constants';
import {TestStepArgs} from '@/static/new-ui/features/suites/components/TestStepArgs';
import {getIconByStatus} from '@/static/new-ui/utils';
import {ErrorInfo} from '@/static/new-ui/components/ErrorInfo';
import * as actions from '@/static/modules/actions';
import {getCurrentResultId} from '@/static/new-ui/store/selectors';
import {getStepsExpandedById, getTestSteps} from './selectors';
import {Step, StepType} from './types';
import {ListItemViewContentType, TreeViewItem} from '../../../../components/TreeViewItem';
import styles from './index.module.css';

interface TestStepsProps {
    resultId: string;
    testSteps: ListTreeItemType<Step>[];
    stepsExpandedById: Record<string, boolean>;
    actions: typeof actions;
}

function TestStepsInternal(props: TestStepsProps): ReactNode {
    const items = useList({
        items: props.testSteps,
        withExpandedState: true,
        controlledState: {
            expandedById: props.stepsExpandedById
        }
    });
    console.log(items);
    console.log(props.testSteps);

    const onItemClick = useCallback(({id}: {id: string}): void => {
        if (props.stepsExpandedById[id] === undefined) {
            console.log('no such item with id');
            console.log(id);

            return;
        }

        props.actions.setStepsExpandedState({
            resultId: props.resultId,
            expandedById: Object.assign({}, props.stepsExpandedById, {[id]: !props.stepsExpandedById[id]})
        });
    }, [items, props.actions, props.stepsExpandedById]);

    return <CollapsibleSection id={'steps'} title={'Steps'} body={
        <ListContainerView>
            {items.structure.visibleFlattenIds.map(itemId => {
                const item = items.structure.itemsById[itemId];
                // const isLeaf = items.state.expandedById?.[itemId] === undefined;

                if (item.type === StepType.Action) {
                    const shouldHighlightFail = item.status === TestStatus.ERROR && !item.isGroup;

                    return <TreeViewItem id={itemId} key={itemId} list={items} isFailed={shouldHighlightFail} onItemClick={onItemClick}
                        mapItemDataToContentProps={(): ListItemViewContentType => {
                            return {
                                title: <div className={styles.stepContent}>
                                    <span className={styles.stepTitle}>{item.title}</span>
                                    <TestStepArgs args={item.args} isFailed={shouldHighlightFail}/>
                                    <span className={styles.stepDuration}>{item.duration} ms</span>
                                </div>,
                                startSlot: <TreeViewItemIcon>{getIconByStatus(item.status)}</TreeViewItemIcon>
                            };
                        }}/>;
                } else if (item.type === StepType.Attachment) {
                    return <TreeViewItem id={itemId} key={itemId} list={items} onItemClick={onItemClick}
                        mapItemDataToContentProps={(): ListItemViewContentType => {
                            return {
                                title: item.title,
                                startSlot: <TreeViewItemIcon><Paperclip /></TreeViewItemIcon>
                            };
                        }}/>;
                } else if (item.type === StepType.ErrorInfo) {
                    const indent = items.structure.itemsState[itemId].indentation;
                    return <ErrorInfo className={styles.errorInfo} key={itemId} {...item} style={{marginLeft: `${indent * 24}px`}}/>;
                }

                return null;
            })}
        </ListContainerView>
    } />;
}

export const TestSteps = connect((state: State) => ({
    resultId: getCurrentResultId(state) ?? '',
    testSteps: getTestSteps(state),
    stepsExpandedById: getStepsExpandedById(state)
}), (dispatch) => ({actions: bindActionCreators(actions, dispatch)}))(TestStepsInternal);
