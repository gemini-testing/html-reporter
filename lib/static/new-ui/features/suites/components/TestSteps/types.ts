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
    startTime?: number;
    isGroup: boolean;
    hasChildren: boolean;
    repeat?: number;
}

export interface Attachment {
    type: StepType.Attachment;
    title: string;
    hasChildren: boolean;
    repeat?: number;
}

export interface ErrorInfo {
    type: StepType.ErrorInfo;
    name: string;
    stack?: string;
    repeat?: number;
}

export interface SingleImage {
    type: StepType.SingleImage;
    image: ImageFile;
    repeat?: number;
}

export interface AssertViewResult {
    type: StepType.AssertViewResult;
    result: ImageEntity;
    repeat?: number;
}

export type Step = Action | Attachment | ErrorInfo | SingleImage | AssertViewResult;
