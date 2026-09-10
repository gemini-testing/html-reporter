import path from 'node:path';
import type {Config} from 'testplane';
import type {ConfigAdapter} from './';
import type {TestplaneTestAdapter} from '../test/testplane';
import type {SecretConfigFilter} from '../../types';

const MASKED_VALUE = 'XXXX';
const SENSITIVE_CONFIG_FIELDS = [
    'token',
    'secret',
    'password',
    'apiKey',
    'accessKey',
    'privateKey',
    'clientSecret'
].map(field => field.toLowerCase());

export const defaultSecretConfigFilter: SecretConfigFilter = (configPath) => {
    const normalizedSegments = configPath
        .split('/')
        .slice(1)
        .map(segment => segment
            .replace(/~1/g, '/')
            .replace(/~0/g, '~')
            .replace(/[^a-z0-9]/gi, '')
            .toLowerCase()
        );

    return normalizedSegments.some(segment => SENSITIVE_CONFIG_FIELDS.some(field => segment.includes(field)));
};

const appendPath = (parentPath: string, segment: string): string => {
    const escapedSegment = segment.replace(/~/g, '~0').replace(/\//g, '~1');

    return `${parentPath}/${escapedSegment}`;
};

export const maskTokenValues = (
    value: unknown,
    secretConfigFilter: SecretConfigFilter = defaultSecretConfigFilter,
    configPath = ''
): unknown => {
    if (typeof value === 'string') {
        return secretConfigFilter(configPath) ? MASKED_VALUE : value;
    }

    if (Array.isArray(value)) {
        return value.map((nestedValue, index) => maskTokenValues(
            nestedValue,
            secretConfigFilter,
            appendPath(configPath, String(index))
        ));
    }

    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, nestedValue]) => [
            key,
            maskTokenValues(nestedValue, secretConfigFilter, appendPath(configPath, key))
        ]));
    }

    return value;
};

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

    get configPath(): string | undefined {
        return this._config.configPath;
    }

    getBrowserConfig(browserId: string): ReturnType<Config['forBrowser']> {
        return this._config.forBrowser(browserId);
    }

    getUserConfig(secretConfigFilter: SecretConfigFilter | null = null): Record<string, unknown> {
        if (!this._config.configPath) {
            return {};
        }

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const configModule: unknown = require(path.resolve(this._config.configPath));
        const config = configModule && typeof configModule === 'object' && '__esModule' in configModule && configModule.__esModule && 'default' in configModule
            ? configModule.default
            : configModule;

        const userConfig = config && typeof config === 'object'
            ? config as Record<string, unknown>
            : {};

        return maskTokenValues(userConfig, secretConfigFilter ?? defaultSecretConfigFilter) as Record<string, unknown>;
    }

    getScreenshotPath(test: TestplaneTestAdapter, stateName: string): string {
        const {browserId} = test;

        return this._config.browsers[browserId].getScreenshotPath(test.original, stateName);
    }
}
