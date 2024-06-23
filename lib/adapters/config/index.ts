import {TestAdapter} from '../test';

export interface BrowserConfigAdapter {
    readonly id: string;
    retry: number;
}

export interface ConfigAdapter {
    readonly tolerance: number;
    readonly antialiasingTolerance: number;

    getScreenshotPath(test: TestAdapter, state: string): string;

    getBrowserIds(): string[];

    forBrowser(browserId: string): BrowserConfigAdapter;
}
