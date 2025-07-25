import {
    unstable_ListContainerView as ListContainerView,
    unstable_ListTreeItemType as ListTreeItemType,
    unstable_useList as useList
} from '@gravity-ui/uikit/unstable';
import {CircleExclamation, Paperclip, Cubes3Overlap} from '@gravity-ui/icons';
import classNames from 'classnames';
import React, {ReactNode, useCallback, useEffect} from 'react';
import {connect, useDispatch, useSelector} from 'react-redux';
import {bindActionCreators} from 'redux';

import {TreeViewItemIcon} from '@/static/new-ui/components/TreeViewItemIcon';
import {TestStepArgs} from '@/static/new-ui/features/suites/components/TestStepArgs';
import {getIconByStatus} from '@/static/new-ui/utils';
import {ErrorInfo} from '@/static/new-ui/components/ErrorInfo';
import * as actions from '@/static/modules/actions';
import {getCurrentResult, getCurrentResultId} from '@/static/new-ui/features/suites/selectors';
import {getStepsExpandedById, getTestSteps} from './selectors';
import {Step, StepType} from './types';
import {ListItemViewContentType, TreeViewItem} from '../../../../components/TreeViewItem';
import styles from './index.module.css';
import {Screenshot} from '@/static/new-ui/components/Screenshot';
import {getIndentStyle} from '@/static/new-ui/features/suites/components/TestSteps/utils';
import {isErrorStatus, isFailStatus} from '@/common-utils';
import {ScreenshotsTreeViewItem} from '@/static/new-ui/features/suites/components/ScreenshotsTreeViewItem';
import {ErrorHandler} from '../../../error-handling/components/ErrorHandling';
import {goToTimeInSnapshotsPlayer, setCurrentPlayerHighlightTime} from '@/static/modules/actions/snapshots';
import {setCurrentStep} from '@/static/modules/actions';
import {useNavigate} from 'react-router-dom';

type TestStepClickHandler = (item: {id: string}) => void

type UseListResult<T> = ReturnType<typeof useList<T>>;

interface TestStepProps {
    items: UseListResult<Step>;
    itemId: string;
    isActive?: boolean;
    className?: string;
}

interface TestStepPropsActionable extends TestStepProps {
    onItemClick: TestStepClickHandler;
    onMouseMove?: () => unknown;
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

function TestStep({onItemClick, items, itemId, onMouseMove, isActive, className}: TestStepPropsActionable): ReactNode {
    const item = items.structure.itemsById[itemId];

    if (item.type === StepType.Action) {
        const shouldHighlightFail = (isErrorStatus(item.status) || isFailStatus(item.status)) && !item.isGroup;

        const isRepeatedGroup = item.repeat && item.hasChildren;
        const isRepeatedGroupItem = item.repeat === -1;

        return (
            <TreeViewItem
                className={className}
                id={itemId}
                key={itemId}
                list={items}
                status={shouldHighlightFail ? 'error' : undefined}
                onItemClick={onItemClick}
                onMouseMove={onMouseMove}
                mapItemDataToContentProps={(): ListItemViewContentType => ({
                    title: (
                        <div className={styles.stepContent}>
                            <span className={styles.stepTitle}>{item.title}</span>
                            <TestStepArgs args={item.args} isFailed={shouldHighlightFail} isActive={isActive}/>
                            {(item.repeat && item.repeat > 0) && <div className={styles.stepRepeat}>×{item.repeat}</div>}
                            {item.duration !== undefined && (
                                <span
                                    className={classNames(styles.stepDuration, isRepeatedGroupItem && styles.stepDurationAvg)}
                                >{item.duration} ms</span>
                            )}
                        </div>
                    ),
                    startSlot: <TreeViewItemIcon>{isRepeatedGroup ? <Cubes3Overlap /> : getIconByStatus(item.status)}</TreeViewItemIcon>
                })}
                isActive={isActive}/>
        );
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
    const navigate = useNavigate();
    const currentResult = useSelector(getCurrentResult);

    const currentStepId = useSelector(state => state.app.suitesPage.currentStepId);
    const currentHighlightStepId = useSelector(state => state.app.suitesPage.currentHighlightedStepId);

    const items = useList({
        items: props.testSteps,
        withExpandedState: true,
        controlledState: {
            expandedById: props.stepsExpandedById
        }
    });

    useEffect(() => {
        dispatch(setCurrentStep({stepId: null}));
    }, [props.resultId]);

    const onItemClick = useCallback((id: string, step: Step): void => {
        if (props.stepsExpandedById[id] === undefined) {
            if (step.type !== StepType.Action || step.startTime === undefined || step.duration === undefined) {
                return;
            }

            dispatch(setCurrentStep({stepId: id}));
            dispatch(goToTimeInSnapshotsPlayer({time: step.startTime + step.duration}));
        }

        props.actions.setStepsExpandedState({
            resultId: props.resultId,
            expandedById: Object.assign({}, props.stepsExpandedById, {[id]: !props.stepsExpandedById[id]})
        });

        if (step.type === StepType.Action) {
            navigate('/' + [
                'suites',
                currentResult?.parentId as string,
                step.args[0] as string,
                currentResult?.attempt?.toString() as string
            ].map(encodeURIComponent).join('/'));
        }
    }, [items, props.actions, props.stepsExpandedById]);

    const currentSnapshotsPlayerState = useSelector(state => state.app.snapshotsPlayer);
    const onStepMouseMove = useCallback((step: Step): void => {
        if (step.type !== StepType.Action || step.startTime === undefined || step.duration === undefined) {
            return;
        }

        const startTime = step.startTime;
        const endTime = step.startTime + step.duration;

        if (startTime === currentSnapshotsPlayerState.highlightStartTime && endTime === currentSnapshotsPlayerState.highlightEndTime) {
            return;
        }

        dispatch(setCurrentPlayerHighlightTime({startTime, endTime, isActive: true}));
    }, [currentSnapshotsPlayerState]);

    const onStepMouseLeave = useCallback((): void => {
        dispatch(setCurrentPlayerHighlightTime({
            startTime: currentSnapshotsPlayerState.highlightStartTime,
            endTime: currentSnapshotsPlayerState.highlightEndTime,
            isActive: false
        }));
    }, [currentSnapshotsPlayerState]);

    return <ListContainerView className={props.className} extraProps={{onMouseLeave: (): void => onStepMouseLeave()}}>
        {items.structure.visibleFlattenIds.map((itemId, index) =>
            (
                <ErrorHandler.Boundary key={itemId} fallback={<ListItemCorrupted items={items} itemId={itemId}/>}>
                    <TestStep
                        className={classNames(styles.step, {[styles['step--dimmed']]: currentHighlightStepId && currentHighlightStepId !== itemId})}
                        key={itemId}
                        isActive={itemId === currentStepId}
                        onItemClick={(): void => onItemClick(itemId, items.structure.itemsById[itemId])}
                        items={items}
                        itemId={itemId}
                        index={index}
                        onMouseMove={(): void => onStepMouseMove(items.structure.itemsById[itemId])}
                    />
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
