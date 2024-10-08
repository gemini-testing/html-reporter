import {createSelector} from 'reselect';
import {AssertViewResult, Attachment, ErrorInfo, Step, StepType} from './types';
import {TestStepCompressed, TestStepKey} from '@/types';
import {unstable_ListTreeItemType as ListTreeItemType} from '@gravity-ui/uikit/unstable';
import {TestStatus} from '@/constants';
import {isAssertViewError, isImageDiffError, mergeSnippetIntoErrorStack} from '@/common-utils';
import {traverseTree} from '@/static/new-ui/features/suites/components/TestSteps/utils';
import {ImageEntityError} from '@/static/new-ui/types/store';
import {
    getCurrentResult,
    getCurrentResultImages,
    getExpandedStepsById
} from '@/static/new-ui/features/suites/selectors';

export const getTestSteps = createSelector(
    [getCurrentResult, getCurrentResultImages],
    (result, images): ListTreeItemType<Step>[] => {
        if (!result || !result.history) {
            return [];
        }

        const formatTestSteps = (steps: TestStepCompressed[], parentId?: string): ListTreeItemType<Step>[] => {
            return steps.map((step, index): ListTreeItemType<Step> => {
                const hasChildren = Boolean(step[TestStepKey.Children] && step[TestStepKey.Children]?.length > 0);

                const formattedStep: ListTreeItemType<Step> = {
                    id: `${parentId} ${index}`,
                    data: {
                        type: StepType.Action,
                        title: step[TestStepKey.Name],
                        duration: step[TestStepKey.Duration],
                        status: step[TestStepKey.IsFailed] ? TestStatus.ERROR : TestStatus.SUCCESS,
                        args: step[TestStepKey.Args],
                        isGroup: step[TestStepKey.IsGroup],
                        hasChildren
                    }
                };

                if (hasChildren) {
                    formattedStep.children = formatTestSteps(step[TestStepKey.Children] as TestStepCompressed[], formattedStep.id);
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

        // Adding error stack
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
                        title: 'Error',
                        hasChildren: true
                    } satisfies Attachment,
                    children: [errorAttachment]
                });
            } else if (lastErroredStep) {
                lastErroredStep.children = [errorAttachment];
            }
        }

        // Integrating images into test steps
        for (const image of images) {
            if (!image.stateName) {
                continue;
            }

            let matchedStep: ListTreeItemType<Step> | undefined;

            traverseTree(steps, step => {
                if (step.data.type === StepType.Action && step.data.title === 'assertView' && step.data.args[0] === image.stateName) {
                    matchedStep = step;
                }
            });

            if (matchedStep) {
                if (matchedStep.data.type === StepType.Action) {
                    matchedStep.data.hasChildren = true;
                }
            } else {
                matchedStep = {
                    id: `${image.id} assertView`,
                    data: {
                        type: StepType.Action,
                        title: 'assertView',
                        status: image.status,
                        args: [image.stateName],
                        isGroup: false,
                        hasChildren: true
                    }
                };
                steps.push(matchedStep);
            }

            if (image.status === TestStatus.ERROR && image.error) {
                const errorInfo: ListTreeItemType<ErrorInfo> = {
                    id: `${image.id} assertView error-info`,
                    data: {
                        type: StepType.ErrorInfo,
                        name: image.error.name,
                        stack: image.error.stack
                    }
                };
                const errorAttachment = {
                    id: `${image.id} assertView error`,
                    data: {
                        type: StepType.Attachment,
                        title: 'Error',
                        hasChildren: true
                    } satisfies Attachment,
                    children: [errorInfo]
                };

                if (!matchedStep.children) {
                    matchedStep.children = [];
                }

                matchedStep.children.push(errorAttachment);
            }

            const imageStep: ListTreeItemType<AssertViewResult> = {
                id: `${image.id} image`,
                data: {
                    type: StepType.AssertViewResult,
                    result: image
                }
            };

            if (matchedStep.data.type === StepType.Action) {
                matchedStep.data.status = image.status;
            }

            if (matchedStep.children && matchedStep.children.length > 0) {
                matchedStep.children.push({
                    id: `${matchedStep.id} attachment`,
                    data: {
                        type: StepType.Attachment,
                        title: 'Screenshots',
                        hasChildren: true
                    },
                    children: [imageStep]
                });
            } else {
                matchedStep.children = [imageStep];
            }
        }

        // Adding page screenshot
        const pageScreenshot = images.find(image => image.status === TestStatus.ERROR && !image.stateName);
        if (pageScreenshot) {
            steps.push({
                id: 'page-screenshot',
                data: {
                    type: StepType.Attachment,
                    title: 'Page Screenshot',
                    hasChildren: true
                },
                children: [{
                    id: 'page-screenshot-image',
                    data: {
                        type: StepType.SingleImage,
                        image: (pageScreenshot as ImageEntityError).actualImg
                    }
                }]
            });
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
