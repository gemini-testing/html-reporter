export interface ITestResult {
    assertViewResults?: any[];
    retriesLeft?: number;
    description?: string;
    sessionId?: string;
    browserId?: string;
    imagesInfo?: any[];
    attempt?: number;
    title?: string;
    err?: Error;
    meta?: {
        url: string;
    };
    id?(): string;
}

export interface ITestTool {
    [key: string]: any;
}
