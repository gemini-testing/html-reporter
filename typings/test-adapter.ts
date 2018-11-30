import { ISuite } from './suite-adapter';

export interface ITestResult {
    assertViewResults?: any[];
    referencePath?: string;
    retriesLeft?: number;
    currentPath?: string;
    description?: string;
    sessionId?: string;
    browserId?: string;
    imagePath?: string;
    imagesInfo?: any[];
    attempt?: number;
    title?: string;
    err?: Error;
    suite?: ISuite;
    equal?: boolean;
    path?: string[];
    state?: {
        name: string[];
    };
    meta?: {
        url: string;
    };
    id?(): string;
    saveDiffTo?(...args: any[]): any;
}

export interface ITestTool {
    [key: string]: any;
}
