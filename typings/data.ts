import { ISuite } from './suite-adapter';

export interface IData {
    [key: string]: any;
    suites: ISuite[];
}

export interface ISkip {
    [key: string]: any;
}

export interface IRetry {
    [key: string]: any;
}

export interface IField {
    fromFields?: string[];
    newAttempt?: any;
    fieldName?: string;
}
