import type {Config} from 'testplane';
import type {ConfigAdapter} from './index';
import {TestplaneTest} from '../test/testplane';

export class TestplaneConfigAdapter implements ConfigAdapter {
    private _config: Config;

    constructor(config: Config) {
        this._config = config;
    }

    static create<T extends TestplaneConfigAdapter>(this: new (config: Config) => T, config: Config): T {
        return new this(config);
    }

    get tolerance(): number {
        return this._config.tolerance;
    }

    get antialiasingTolerance(): number {
        return this._config.antialiasingTolerance;
    }

    getScreenshotPath(test: TestplaneTest, stateName: string): string {
        const {browserId} = test;

        return this._config.browsers[browserId].getScreenshotPath(test.originalTest, stateName);
    }

    getBrowserIds(): string[] {
        return this._config.getBrowserIds();
    }

    forBrowser(browserId: string): ReturnType<Config['forBrowser']> {
        return this._config.forBrowser(browserId);
    }
}
