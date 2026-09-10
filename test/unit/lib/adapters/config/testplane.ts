import path from 'node:path';
import type {Config, Test} from 'testplane';
import sinon from 'sinon';
import {defaultSecretConfigFilter, maskTokenValues, TestplaneConfigAdapter} from '../../../../../lib/adapters/config/testplane';
import {TestplaneTestAdapter} from '../../../../../lib/adapters/test/testplane';
import {stubConfig, mkState} from '../../../utils';

describe('lib/adapters/config/testplane', () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => sandbox.restore());

    describe('tolerance', () => {
        it('should return tolerance from original config', () => {
            const config = stubConfig({tolerance: 100500}) as unknown as Config;
            const configAdapter = TestplaneConfigAdapter.create(config);

            assert.equal(configAdapter.tolerance, 100500);
        });
    });

    describe('antialiasingTolerance', () => {
        it('should return antialiasingTolerance from original config', () => {
            const config = stubConfig({antialiasingTolerance: 500100}) as unknown as Config;
            const configAdapter = TestplaneConfigAdapter.create(config);

            assert.equal(configAdapter.antialiasingTolerance, 500100);
        });
    });

    describe('browserIds', () => {
        it('should return browser ids from original config', () => {
            const config = stubConfig({browsers: {yabro1: {}, yabro2: {}}}) as unknown as Config;
            const configAdapter = TestplaneConfigAdapter.create(config);

            assert.deepEqual(configAdapter.browserIds, ['yabro1', 'yabro2']);
        });
    });

    describe('configPath', () => {
        it('should return config path from original config', () => {
            const configPath = '/some/config/path';
            const config = stubConfig({configPath}) as unknown as Config;
            const configAdapter = TestplaneConfigAdapter.create(config);

            assert.equal(configAdapter.configPath, configPath);
        });
    });

    describe('getUserConfig', () => {
        it('should not mix config path into user config', () => {
            const config = stubConfig({configPath: path.resolve(process.cwd(), 'package.json')}) as unknown as Config;
            const configAdapter = TestplaneConfigAdapter.create(config);

            const userConfig = configAdapter.getUserConfig();

            assert.notProperty(userConfig, 'configPath');
        });
    });

    describe('getBrowserConfig', () => {
        it('should return browser config from original config', () => {
            const browserConfig = {foo: 'bar'} as unknown as ReturnType<Config['forBrowser']>;
            const config = stubConfig({browsers: {yabro: browserConfig}}) as unknown as Config;
            const configAdapter = TestplaneConfigAdapter.create(config);

            assert.deepEqual(configAdapter.getBrowserConfig('yabro'), browserConfig);
        });
    });

    describe('getScreenshotPath', () => {
        it('should return screenshot path from original browser config', () => {
            const test = mkState({browserId: 'yabro'});
            const testAdapter = TestplaneTestAdapter.create(test as unknown as Test);
            const stateName = 'plain';

            const getScreenshotPath = sandbox.stub().withArgs(test, stateName).returns('/ref/path');
            const config = stubConfig({browsers: {yabro: {getScreenshotPath}}}) as unknown as Config;
            const configAdapter = TestplaneConfigAdapter.create(config);

            assert.equal(configAdapter.getScreenshotPath(testAdapter, stateName), '/ref/path');
        });
    });
});

describe('maskTokenValues', () => {
    it('should recursively mask values whose paths contain sensitive field names ignoring case and separators', () => {
        const config = {
            token: 'secret-1',
            authToken: 'secret-2',
            nested: {
                API_TOKEN_VALUE: 'secret-3',
                items: [{refreshToken: 'secret-4'}],
                secret: 'secret-5',
                password: 'secret-6',
                'api_key': 'secret-7',
                accessKey: 'secret-8',
                'private_key': 'secret-9',
                CLIENT_SECRET: 'secret-10'
            },
            browser: 'chrome'
        };

        assert.deepEqual(maskTokenValues(config), {
            token: 'XXXX',
            authToken: 'XXXX',
            nested: {
                API_TOKEN_VALUE: 'XXXX',
                items: [{refreshToken: 'XXXX'}],
                secret: 'XXXX',
                password: 'XXXX',
                'api_key': 'XXXX',
                accessKey: 'XXXX',
                'private_key': 'XXXX',
                CLIENT_SECRET: 'XXXX'
            },
            browser: 'chrome'
        });
    });

    it('should mask all string values nested under a sensitive path', () => {
        const config = {credentials: {apiKey: {primary: 'secret-1', fallback: 'secret-2'}}};

        assert.deepEqual(maskTokenValues(config), {
            credentials: {apiKey: {primary: 'XXXX', fallback: 'XXXX'}}
        });
    });

    it('should call custom filter for every string value with full JSON pointer path', () => {
        const secretConfigFilter = sinon.spy((configPath: string) => configPath === '/nested~1key/items/1');
        const config = {
            visible: 'keep-me',
            'nested/key': {items: ['also-keep-me', 'hide-me']},
            count: 42
        };

        assert.deepEqual(maskTokenValues(config, secretConfigFilter), {
            visible: 'keep-me',
            'nested/key': {items: ['also-keep-me', 'XXXX']},
            count: 42
        });
        assert.deepEqual(secretConfigFilter.args, [
            ['/visible'],
            ['/nested~1key/items/0'],
            ['/nested~1key/items/1']
        ]);
    });

    it('should not use default filter when custom filter is specified', () => {
        const config = {token: 'keep-me'};

        assert.deepEqual(maskTokenValues(config, () => false), config);
    });

    describe('defaultSecretConfigFilter', () => {
        it('should not mask values whose paths do not contain sensitive field names', () => {
            assert.isFalse(defaultSecretConfigFilter('/browser/id'));
        });
    });

    it('should not mutate original value', () => {
        const config = {nested: {accessToken: 'secret'}};

        maskTokenValues(config);

        assert.deepEqual(config, {nested: {accessToken: 'secret'}});
    });
});
