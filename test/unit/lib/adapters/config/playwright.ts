import path from 'node:path';
import sinon from 'sinon';

import {PlaywrightConfigAdapter, DEFAULT_BROWSER_ID, type PwtConfig, type PwtProject} from '../../../../../lib/adapters/config/playwright';
import {PlaywrightTestAdapter, type PwtRawTest} from '../../../../../lib/adapters/test/playwright';

describe('lib/adapters/config/testplane', () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => sandbox.restore());

    describe('original', () => {
        it('should return original config', () => {
            const config = {} as PwtConfig;

            assert.equal(PlaywrightConfigAdapter.create(config).original, config);
        });
    });

    describe('tolerance', () => {
        it('should return default value', () => {
            assert.equal(PlaywrightConfigAdapter.create({} as PwtConfig).tolerance, 2.3);
        });
    });

    describe('antialiasingTolerance', () => {
        it('should return default value', () => {
            assert.equal(PlaywrightConfigAdapter.create({} as PwtConfig).antialiasingTolerance, 4);
        });
    });

    describe('browserIds', () => {
        it('should return browsers from "projects" field', () => {
            const config = {
                projects: [
                    {name: 'yabro1'},
                    {name: 'yabro2'}
                ]
            } as PwtConfig;

            assert.deepEqual(PlaywrightConfigAdapter.create(config).browserIds, ['yabro1', 'yabro2']);
        });

        it('should return default browser if "projects" are not specified', () => {
            assert.deepEqual(PlaywrightConfigAdapter.create({} as PwtConfig).browserIds, [DEFAULT_BROWSER_ID]);
        });
    });

    describe('getScreenshotPath', () => {
        const mkConfig_ = ({cfg, prjCfg}: {cfg?: Partial<PwtConfig>, prjCfg?: Partial<PwtProject>} = {cfg: {}, prjCfg: {}}): PwtConfig => ({
            snapshotPathTemplate: 'cfg_{testDir}/{snapshotDir}/{snapshotSuffix}/{testFileDir}/{platform}/{projectName}/{testName}/{testFileName}/{testFilePath}/{arg}/{ext}',
            testDir: './cfg_tests',
            snapshotDir: './cfg_snapshots',
            ...cfg,
            projects: [{
                name: 'prj_bro',
                snapshotPathTemplate: 'prj_{testDir}/{snapshotDir}/{snapshotSuffix}/{testFileDir}/{platform}/{projectName}/{testName}/{testFileName}/{testFilePath}/{arg}/{ext}',
                testDir: './prj_tests',
                snapshotDir: './prj_snapshots',
                ...prjCfg
            }]
        } as PwtConfig);

        const mkTestAdapter_ = (opts: Partial<PwtRawTest> = {}): PlaywrightTestAdapter => {
            const test = {
                file: 'default-path.ts',
                browserName: 'default-bro',
                title: 'suite test',
                titlePath: ['suite', 'test'],
                ...opts
            };

            return PlaywrightTestAdapter.create(test);
        };

        describe('use options from project config', () => {
            it('should return screenshot path with "testDir"', () => {
                const config = mkConfig_({prjCfg: {
                    name: 'yabro',
                    snapshotPathTemplate: '{testDir}',
                    testDir: './tests'
                }});
                const testAdapter = mkTestAdapter_({browserName: 'yabro'});
                const configAdapter = PlaywrightConfigAdapter.create(config);

                assert.equal(configAdapter.getScreenshotPath(testAdapter, 'plain'), path.resolve('./tests'));
            });

            it('should return screenshot path with "snapshotDir"', () => {
                const config = mkConfig_({prjCfg: {
                    name: 'yabro',
                    snapshotPathTemplate: '{snapshotDir}',
                    snapshotDir: './snapshots'
                }});
                const testAdapter = mkTestAdapter_({browserName: 'yabro'});
                const configAdapter = PlaywrightConfigAdapter.create(config);

                assert.equal(configAdapter.getScreenshotPath(testAdapter, 'plain'), path.resolve('./snapshots'));
            });

            ['snapshotSuffix', 'platform'].forEach(fieldName => {
                it(`should return screenshot path with "${fieldName}"`, () => {
                    const config = mkConfig_({prjCfg: {
                        name: 'yabro',
                        snapshotPathTemplate: `{${fieldName}}`
                    }});
                    const testAdapter = mkTestAdapter_({browserName: 'yabro'});
                    const configAdapter = PlaywrightConfigAdapter.create(config);

                    assert.equal(configAdapter.getScreenshotPath(testAdapter, 'plain'), path.resolve(process.platform));
                });
            });

            it('should return screenshot path with "testFileDir"', () => {
                const config = mkConfig_({prjCfg: {
                    name: 'yabro',
                    snapshotPathTemplate: '{testFileDir}'
                }});
                const testAdapter = mkTestAdapter_({browserName: 'yabro', file: './dir/file.test.ts'});
                const configAdapter = PlaywrightConfigAdapter.create(config);

                assert.equal(configAdapter.getScreenshotPath(testAdapter, 'plain'), path.resolve('./dir'));
            });

            it('should return screenshot path with "projectName"', () => {
                const config = mkConfig_({prjCfg: {
                    name: 'yabro/123',
                    snapshotPathTemplate: '{projectName}'
                }});
                const testAdapter = mkTestAdapter_({browserName: 'yabro/123'});
                const configAdapter = PlaywrightConfigAdapter.create(config);

                assert.equal(configAdapter.getScreenshotPath(testAdapter, 'plain'), path.resolve('yabro-123'));
            });

            it('should return screenshot path with "testName"', () => {
                const config = mkConfig_({prjCfg: {
                    name: 'yabro',
                    snapshotPathTemplate: '{testName}'
                }});
                const testAdapter = mkTestAdapter_({browserName: 'yabro', titlePath: ['foo', 'bar']});
                const configAdapter = PlaywrightConfigAdapter.create(config);

                assert.equal(configAdapter.getScreenshotPath(testAdapter, 'plain'), path.resolve('foo-bar'));
            });

            it('should return screenshot path with "testFileName"', () => {
                const config = mkConfig_({prjCfg: {
                    name: 'yabro',
                    snapshotPathTemplate: '{testFileName}'
                }});
                const testAdapter = mkTestAdapter_({browserName: 'yabro', file: './dir/file.test.ts'});
                const configAdapter = PlaywrightConfigAdapter.create(config);

                assert.equal(configAdapter.getScreenshotPath(testAdapter, 'plain'), path.resolve('file.test.ts'));
            });

            it('should return screenshot path with "testFilePath"', () => {
                const config = mkConfig_({prjCfg: {
                    name: 'yabro',
                    snapshotPathTemplate: '{testFilePath}'
                }});
                const testAdapter = mkTestAdapter_({browserName: 'yabro', file: './dir/file.test.ts'});
                const configAdapter = PlaywrightConfigAdapter.create(config);

                assert.equal(configAdapter.getScreenshotPath(testAdapter, 'plain'), path.resolve('./dir/file.test.ts'));
            });

            it('should return screenshot path with "arg"', () => {
                const config = mkConfig_({prjCfg: {
                    name: 'yabro',
                    snapshotPathTemplate: '{arg}'
                }});
                const testAdapter = mkTestAdapter_({browserName: 'yabro'});
                const configAdapter = PlaywrightConfigAdapter.create(config);

                assert.equal(configAdapter.getScreenshotPath(testAdapter, 'first/plain'), path.resolve('first/plain'));
            });

            it('should return screenshot path with "ext"', () => {
                const config = mkConfig_({prjCfg: {
                    name: 'yabro',
                    snapshotPathTemplate: '{ext}'
                }});
                const testAdapter = mkTestAdapter_({browserName: 'yabro'});
                const configAdapter = PlaywrightConfigAdapter.create(config);

                assert.equal(configAdapter.getScreenshotPath(testAdapter, 'plain'), path.resolve('.png'));
            });
        });

        it('should return screenshot path with options from main config', () => {
            const config = mkConfig_({cfg: {
                snapshotPathTemplate: '{testDir}/{snapshotDir}/{snapshotSuffix}/{testFileDir}/{platform}/{projectName}/{testName}/{testFileName}/{testFilePath}/{arg}/{ext}',
                testDir: './tests',
                snapshotDir: './snapshots'
            }});
            const testAdapter = mkTestAdapter_({browserName: 'yabro/123', file: './dir/file.test.ts', titlePath: ['foo', 'bar']});
            const configAdapter = PlaywrightConfigAdapter.create(config);

            assert.equal(
                configAdapter.getScreenshotPath(testAdapter, 'first/plain'),
                `${path.resolve('./tests')}${path.resolve('./snapshots')}/${process.platform}/dir/` +
                `${process.platform}/yabro-123/foo-bar/file.test.ts/dir/file.test.ts/first/plain/.png`
            );
        });
    });
});
