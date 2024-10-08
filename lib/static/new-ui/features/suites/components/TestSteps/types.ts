import {TestStatus} from '@/constants';
import {ImageFile} from '@/types';
import {ImageEntity} from '@/static/new-ui/types/store';

export enum StepType {
    Action,
    Attachment,
    ErrorInfo,
    SingleImage,
    AssertViewResult
}

export interface Action {
    type: StepType.Action;
    status: TestStatus;
    title: string;
    args: string[];
    duration?: number;
    isGroup: boolean;
    hasChildren: boolean;
}

export interface Attachment {
    type: StepType.Attachment;
    title: string;
    hasChildren: boolean;
}

export interface ErrorInfo {
    type: StepType.ErrorInfo;
    name: string;
    stack?: string;
}

export interface SingleImage {
    type: StepType.SingleImage;
    image: ImageFile;
}

export interface AssertViewResult {
    type: StepType.AssertViewResult;
    result: ImageEntity;
}

export type Step = Action | Attachment | ErrorInfo | SingleImage | AssertViewResult;
