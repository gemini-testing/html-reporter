import {TestStatus} from '@/constants';
import {ImageFile} from '@/types';

export enum StepType {
    Action,
    Attachment,
    ErrorInfo,
    SingleImage
}

export interface Action {
    type: StepType.Action;
    status: TestStatus;
    title: string;
    args: string[];
    duration: number;
    isGroup: boolean;
}

export interface Attachment {
    type: StepType.Attachment;
    title: string;
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

export type Step = Action | Attachment | ErrorInfo | SingleImage;
