import {TestAdapter} from '../test';

export interface ConfigAdapter {
    readonly tolerance: number;
    readonly antialiasingTolerance: number;
    readonly browserIds: string[];

    getScreenshotPath(test: TestAdapter, stateName: string): string;
}
