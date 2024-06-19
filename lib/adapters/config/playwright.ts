import type {ConfigAdapter, BrowserConfigAdapter} from './index';
import type {FullConfig} from '@playwright/test/reporter';
import type {TestplaneTest} from '../test/testplane';

export class PlaywrightConfigAdapter implements ConfigAdapter {
    // TODO: change field
    private _config: FullConfig;

    constructor(config: FullConfig) {
        this._config = config;
        console.log('this._config:', this._config);
    }

    static create<T extends PlaywrightConfigAdapter>(this: new (config: FullConfig) => T, config: FullConfig): T {
        return new this(config);
    }

    get tolerance(): number {
        return 1;
        // return this._config.tolerance;
    }

    get antialiasingTolerance(): number {
        return 4;
        // return this._config.antialiasingTolerance;
    }

    getScreenshotPath(test: TestplaneTest, stateName: string): string {
        console.log('getScreenshotPath, test:', test);
        console.log('getScreenshotPath, stateName:', stateName);

        // const {browserId} = test;
        // return this._config.browsers[browserId].getScreenshotPath(test.originalTest, stateName);

        return './screens';
    }

    getBrowserIds(): string[] {
        return ['chromium'];
        // return this._config.getBrowserIds();
    }

    forBrowser(browserId: string): BrowserConfigAdapter {
        console.log('forBrowser, browserId:', browserId);

        return {
            id: 'chromium',
            retry: 0
        };
        // return this._config.forBrowser(browserId);
    }
}
