import {TestAdapter} from '../test';

export interface BrowserConfigAdapter {
    readonly id: string;
    retry: number;
}

export interface ConfigAdapter {
    readonly tolerance: number;
    readonly antialiasingTolerance: number;
    readonly browserIds: string[];

    getBrowserConfig(browserId: string): BrowserConfigAdapter;
    getScreenshotPath(test: TestAdapter, stateName: string): string;
}
