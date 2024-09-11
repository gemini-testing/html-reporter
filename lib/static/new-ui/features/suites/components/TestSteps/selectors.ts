import {createSelector} from 'reselect';
import {getCurrentResult, getExpandedStepsById} from '@/static/new-ui/store/selectors';
import {Attachment, ErrorInfo, Step, StepType} from './types';
import {TestStepCompressed, TestStepKey} from '@/types';
import {unstable_ListTreeItemType as ListTreeItemType} from '@gravity-ui/uikit/unstable';
import {TestStatus} from '@/constants';
import {isAssertViewError, isImageDiffError, mergeSnippetIntoErrorStack} from '@/common-utils';
import {traverseTree} from '@/static/new-ui/features/suites/components/TestSteps/utils';

export const getTestSteps = createSelector(
    [getCurrentResult],
    (result): ListTreeItemType<Step>[] => {
        if (!result || !result.history) {
            return [];
        }

        const formatTestSteps = (steps: TestStepCompressed[], parentId?: string): ListTreeItemType<Step>[] => {
            return steps.map((step, index): ListTreeItemType<Step> => {
                const formattedStep: ListTreeItemType<Step> = {
                    id: `${parentId} ${index}`,
                    data: {
                        type: StepType.Action,
                        title: step[TestStepKey.Name],
                        duration: step[TestStepKey.Duration],
                        status: step[TestStepKey.IsFailed] ? TestStatus.ERROR : TestStatus.SUCCESS,
                        args: step[TestStepKey.Args],
                        isGroup: step[TestStepKey.IsGroup]
                    }
                };

                if (step[TestStepKey.Children] && step[TestStepKey.Children]?.length > 0) {
                    formattedStep.children = formatTestSteps(step[TestStepKey.Children], formattedStep.id);
                }

                return formattedStep;
            });
        };

        function getLastErroredStep(steps: ListTreeItemType<Step>[]): ListTreeItemType<Step> | null {
            let deepestErrorStep: ListTreeItemType<Step> | null = null;

            traverseTree(steps, (step: ListTreeItemType<Step>): void => {
                if (step.data.type === StepType.Action && step.data.status === TestStatus.ERROR) {
                    deepestErrorStep = step;
                }
            });

            return deepestErrorStep;
        }

        const steps = formatTestSteps(result.history, result.id);

        if (result.error && !isImageDiffError(result.error) && !isAssertViewError(result.error)) {
            const lastErroredStep = getLastErroredStep(steps);
            const error = mergeSnippetIntoErrorStack(result.error);
            const errorAttachment: ListTreeItemType<ErrorInfo> = {
                id: `${lastErroredStep?.id} error 0`,
                data: {
                    type: StepType.ErrorInfo,
                    name: error.name,
                    stack: error.stack
                }
            };

            if (lastErroredStep && lastErroredStep.children && lastErroredStep.children.length > 0) {
                lastErroredStep.children.push({
                    id: `${lastErroredStep.id} error`,
                    data: {
                        type: StepType.Attachment,
                        title: 'Error'
                    } satisfies Attachment,
                    children: [errorAttachment]
                });
            } else if (lastErroredStep) {
                lastErroredStep.children = [errorAttachment];
            }
        }

        // TODO: add type-level check that each step has explicit ID
        return steps;
    }
);

export const getStepsExpandedById = createSelector(
    [getTestSteps, getExpandedStepsById],
    (steps, expandedStepsById): Record<string, boolean> => {
        const result: Record<string, boolean> = {};
        traverseTree(steps, step => {
            if (!step.children) {
                return;
            }

            const stepId = step.id as string;
            result[stepId] = expandedStepsById[stepId] ?? true;
        });

        return result;
    }
);
