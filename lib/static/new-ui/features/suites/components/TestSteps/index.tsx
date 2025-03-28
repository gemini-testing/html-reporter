import {
    unstable_ListContainerView as ListContainerView,
    unstable_ListTreeItemType as ListTreeItemType,
    unstable_useList as useList
} from '@gravity-ui/uikit/unstable';
import {CircleExclamation, Paperclip} from '@gravity-ui/icons';
import React, {ReactNode, useCallback} from 'react';
import {connect, useDispatch, useSelector} from 'react-redux';
import {bindActionCreators} from 'redux';

import {TreeViewItemIcon} from '@/static/new-ui/components/TreeViewItemIcon';
import {TestStepArgs} from '@/static/new-ui/features/suites/components/TestStepArgs';
import {getIconByStatus} from '@/static/new-ui/utils';
import {ErrorInfo} from '@/static/new-ui/components/ErrorInfo';
import * as actions from '@/static/modules/actions';
import {getCurrentResultId} from '@/static/new-ui/features/suites/selectors';
import {getStepsExpandedById, getTestSteps} from './selectors';
import {Action, Step, StepType} from './types';
import {ListItemViewContentType, TreeViewItem} from '../../../../components/TreeViewItem';
import styles from './index.module.css';
import {Screenshot} from '@/static/new-ui/components/Screenshot';
import {getIndentStyle} from '@/static/new-ui/features/suites/components/TestSteps/utils';
import {isErrorStatus, isFailStatus} from '@/common-utils';
import {ScreenshotsTreeViewItem} from '@/static/new-ui/features/suites/components/ScreenshotsTreeViewItem';
import {UseListResult} from '@gravity-ui/uikit/build/esm/components/useList';
import {ErrorHandler} from '../../../error-handling/components/ErrorHandling';
import {setCurrentPlayerTime} from '@/static/modules/actions/snapshots';

type TestStepClickHandler = (item: {id: string}) => void

interface TestStepProps {
    items: UseListResult<Step>;
    itemId: string;
}

interface TestStepPropsActionable extends TestStepProps {
    onItemClick: TestStepClickHandler;
    onItemMouseMove: (time: number) => unknown;
    index: number;

}

function ListItemCorrupted({items, itemId}: TestStepProps): ReactNode {
    return <TreeViewItem id={itemId} list={items} status="corrupted"
        mapItemDataToContentProps={(): ListItemViewContentType => ({
            title: <div className={styles.stepContent}>
                <span className={styles.stepTitle}>Couldn’t display this item: data is corrupted. See console for details.</span>
            </div>,
            startSlot: <TreeViewItemIcon>
                <CircleExclamation />
            </TreeViewItemIcon>
        })
        }
    />;
}

function TestStep({onItemClick, items, itemId, index, onItemMouseMove}: TestStepPropsActionable): ReactNode {
    const item = items.structure.itemsById[itemId];

    if (item.type === StepType.Action) {
        let nextAction: Action | null = null;
        for (let i = index + 1; i < items.structure.visibleFlattenIds.length; i++) {
            const maybeAction = items.structure.itemsById[items.structure.visibleFlattenIds[i]];
            if (maybeAction.type === StepType.Action) {
                nextAction = maybeAction;
                break;
            }
        }
        const shouldHighlightFail = (isErrorStatus(item.status) || isFailStatus(item.status)) && !item.isGroup;

        return <TreeViewItem id={itemId} key={itemId} list={items} status={shouldHighlightFail ? 'error' : undefined} onItemClick={onItemClick} onMouseMove={(): void => void onItemMouseMove(nextAction?.startTime ?? item.startTime ?? 0)}
            mapItemDataToContentProps={(): ListItemViewContentType => {
                return {
                    title: <div className={styles.stepContent}>
                        <span className={styles.stepTitle}>{item.title}</span>
                        <TestStepArgs args={item.args} isFailed={shouldHighlightFail}/>
                        {item.duration !== undefined && <span className={styles.stepDuration}>{item.duration} ms</span>}
                    </div>,
                    startSlot: <TreeViewItemIcon>{getIconByStatus(item.status)}</TreeViewItemIcon>
                };
            }}/>;
    }

    if (item.type === StepType.Attachment) {
        return <TreeViewItem id={itemId} key={itemId} list={items} onItemClick={onItemClick}
            mapItemDataToContentProps={(): ListItemViewContentType => {
                return {
                    title: item.title,
                    startSlot: <TreeViewItemIcon><Paperclip /></TreeViewItemIcon>
                };
            }}/>;
    }

    if (item.type === StepType.ErrorInfo) {
        const indent = items.structure.itemsState[itemId].indentation;
        return <ErrorInfo className={styles.errorInfo} key={itemId} {...item} style={{marginLeft: `${indent * 24}px`}}/>;
    }

    if (item.type === StepType.SingleImage) {
        return <Screenshot containerClassName={styles.pageScreenshot} image={item.image} key={itemId} />;
    }

    if (item.type === StepType.AssertViewResult) {
        return <ScreenshotsTreeViewItem key={itemId} image={item.result} style={getIndentStyle(items, itemId)} />;
    }

    // @ts-expect-error all types should be handled here
    throw new Error(`Unknown step type: ${item.type}`);
}

interface TestStepsProps {
    className?: string;
    resultId: string;
    testSteps: ListTreeItemType<Step>[];
    stepsExpandedById: Record<string, boolean>;
    actions: typeof actions;
}

function TestStepsInternal(props: TestStepsProps): ReactNode {
    if (props.testSteps.length === 0) {
        return null;
    }

    const dispatch = useDispatch();

    const items = useList({
        items: props.testSteps,
        withExpandedState: true,
        controlledState: {
            expandedById: props.stepsExpandedById
        }
    });

    const onItemClick = useCallback(({id}: {id: string}): void => {
        if (props.stepsExpandedById[id] === undefined) {
            return;
        }

        props.actions.setStepsExpandedState({
            resultId: props.resultId,
            expandedById: Object.assign({}, props.stepsExpandedById, {[id]: !props.stepsExpandedById[id]})
        });
    }, [items, props.actions, props.stepsExpandedById]);

    const currentPlayerTime = useSelector(state => state.app.snapshots.currentPlayerTime);
    const onItemMouseMove = (time: number): void => {
        if (time === currentPlayerTime) {
            return;
        }

        dispatch(setCurrentPlayerTime({startTime: time}));
    };

    return <ListContainerView className={props.className}>
        {items.structure.visibleFlattenIds.map((itemId, index) =>
            (
                <ErrorHandler.Boundary key={itemId} fallback={<ListItemCorrupted items={items} itemId={itemId}/>}>
                    <TestStep key={itemId} onItemClick={onItemClick} items={items} itemId={itemId} index={index} onItemMouseMove={onItemMouseMove} />
                </ErrorHandler.Boundary>
            )
        )}
    </ListContainerView>;
}
export const TestSteps = connect(state => ({
    resultId: getCurrentResultId(state) ?? '',
    testSteps: getTestSteps(state),
    stepsExpandedById: getStepsExpandedById(state)
}), (dispatch) => ({actions: bindActionCreators(actions, dispatch)}))(TestStepsInternal);
