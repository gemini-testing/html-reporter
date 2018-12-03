import { ISuite } from './suite-adapter';

const TestAdapter = require('../lib/test-adapter/test-adapter');
const HermioneTestAdapter = require('../lib/test-adapter/hermione-test-adapter');
const GeminiTestAdapter = require('../lib/test-adapter/gemini-test-adapter');

export type TestAdapterType = TestAdapter | HermioneTestAdapter | GeminiTestAdapter;

export interface ITestResult {
    assertViewResults?: any[];
    referencePath?: string;
    retriesLeft?: number;
    currentPath?: string;
    description?: string;
    screenshot?: string;
    sessionId?: string;
    browserId?: string;
    imagePath?: string;
    multipleTabs?: any;
    imagesInfo?: any[];
    attempt?: number;
    path?: string[];
    equal?: boolean;
    image?: string;
    title?: string;
    suite?: ISuite;
    error?: string;
    status?: string;
    err?: Error;
    state?: {
        name: string[];
    };
    meta?: {
        url: string;
    };
    id?(): string;
    saveDiffTo?(...args: any[]): any;
    getImagesInfo?(status: string): any;
}

export interface ITestTool {
    [key: string]: any;
}
