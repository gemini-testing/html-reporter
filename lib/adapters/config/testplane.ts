import type {Config} from 'testplane';
import type {ConfigAdapter} from './';
import type {TestplaneTestAdapter} from '../test/testplane';

export class TestplaneConfigAdapter implements ConfigAdapter {
    private _config: Config;

    static create<T extends TestplaneConfigAdapter>(this: new (config: Config) => T, config: Config): T {
        return new this(config);
    }

    constructor(config: Config) {
        this._config = config;
    }

    get tolerance(): number {
        return this._config.tolerance;
    }

    get antialiasingTolerance(): number {
        return this._config.antialiasingTolerance;
    }

    get browserIds(): string[] {
        return this._config.getBrowserIds();
    }

    getBrowserConfig(browserId: string): ReturnType<Config['forBrowser']> {
        return this._config.forBrowser(browserId);
    }

    getScreenshotPath(test: TestplaneTestAdapter, stateName: string): string {
        const {browserId} = test;

        return this._config.browsers[browserId].getScreenshotPath(test.original, stateName);
    }
}
