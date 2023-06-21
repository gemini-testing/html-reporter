'use strict';

const path = require('path');
const fs = require('fs-extra');
const Promise = require('bluebird');
const utils = require('lib/server-utils');
const {IMAGES_PATH} = require('lib/constants/paths');
const testStatuses = require('lib/constants/test-statuses');

describe('server-utils', () => {
    const sandbox = sinon.sandbox.create();

    afterEach(() => sandbox.restore());

    [
        {name: 'Reference', prefix: 'ref'},
        {name: 'Current', prefix: 'current'},
        {name: 'Diff', prefix: 'diff'}
    ].forEach((testData) => {
        describe(`get${testData.name}Path`, () => {
            it('should generate correct reference path for test image', () => {
                const test = {
                    imageDir: 'some/dir',
                    browserId: 'bro',
                    attempt: 2
                };

                const resultPath = utils[`get${testData.name}Path`](test);

                assert.equal(resultPath, path.join(IMAGES_PATH, 'some', 'dir', `bro~${testData.prefix}_2.png`));
            });

            it('should add default attempt if it does not exist from test', () => {
                const test = {
                    imageDir: 'some/dir',
                    browserId: 'bro'
                };

                const resultPath = utils[`get${testData.name}Path`](test);

                assert.equal(resultPath, path.join(IMAGES_PATH, 'some', 'dir', `bro~${testData.prefix}_0.png`));
            });

            it('should add state name to the path if it was passed', () => {
                const test = {
                    imageDir: 'some/dir',
                    browserId: 'bro'
                };

                const resultPath = utils[`get${testData.name}Path`](test, 'plain');

                assert.equal(resultPath, path.join(IMAGES_PATH, 'some', 'dir', `plain/bro~${testData.prefix}_0.png`));
            });
        });

        describe(`get${testData.name}AbsolutePath`, () => {
            beforeEach(() => {
                sandbox.stub(process, 'cwd').returns('/root');
            });

            it('should generate correct absolute path for test image', () => {
                const test = {
                    imageDir: 'some/dir',
                    browserId: 'bro'
                };

                const resultPath = utils[`get${testData.name}AbsolutePath`](test, 'reportPath');

                assert.equal(resultPath, path.join('/root', 'reportPath', IMAGES_PATH, 'some', 'dir', `bro~${testData.prefix}_0.png`));
            });

            it('should add state name to the path if it was passed', () => {
                const test = {
                    imageDir: 'some/dir',
                    browserId: 'bro'
                };

                const resultPath = utils[`get${testData.name}AbsolutePath`](test, 'reportPath', 'plain');

                assert.equal(resultPath, path.join('/root', 'reportPath', IMAGES_PATH, 'some', 'dir', 'plain', `bro~${testData.prefix}_0.png`));
            });
        });
    });

    describe('prepareCommonJSData', () => {
        it('should wrap passed data with commonjs wrapper', () => {
            const result = utils.prepareCommonJSData({some: 'data'});

            const expectedData = 'var data = {"some":"data"};\n'
                + 'try { module.exports = data; } catch(e) {}';

            assert.equal(result, expectedData);
        });

        it('should stringify passed data', () => {
            sandbox.stub(JSON, 'stringify');

            utils.prepareCommonJSData({some: 'data'});

            assert.calledOnceWith(JSON.stringify, {some: 'data'});
        });
    });

    describe('copyFileAsync', () => {
        beforeEach(() => {
            sandbox.stub(fs, 'copy').resolves();
            sandbox.stub(fs, 'mkdirs').resolves();
        });

        it('should create directory and copy image', () => {
            const fromPath = '/from/image.png';
            const toPath = 'to/image.png';
            const pathToReport = '/report-dir';

            return utils.copyFileAsync(fromPath, toPath, {reportDir: pathToReport})
                .then(() => {
                    assert.calledWith(fs.mkdirs, '/report-dir/to');
                    assert.calledWithMatch(fs.copy, fromPath, toPath);
                });
        });
    });

    describe('getDetailsFileName', () => {
        it('should compose correct file name from suite path, browser id and attempt', () => {
            sandbox.stub(Date, 'now').returns('123456789');
            const testId = 'abcdef';
            const expected = `${testId}-bro_2_123456789.json`;

            assert.equal(utils.getDetailsFileName(testId, 'bro', 1), expected);
        });
    });

    describe('shouldUpdateAttempt', () => {
        const IgnoreAttemptStatuses = ['SKIPPED', 'UPDATED', 'RUNNING', 'IDLE'];

        IgnoreAttemptStatuses.forEach((s) => {
            const status = testStatuses[s];
            it(`should return false for "${status}" status`, () => {
                assert.isFalse(utils.shouldUpdateAttempt(status));
            });
        });

        const UpdateAttemptStatuses = Object.keys(testStatuses).filter((s) => !IgnoreAttemptStatuses.includes(testStatuses[s]));

        UpdateAttemptStatuses.forEach((s) => {
            const status = testStatuses[s];
            it(`should return true for ${status} status`, () => {
                assert.isTrue(utils.shouldUpdateAttempt(testStatuses[status]));
            });
        });
    });

    describe('writeDatabaseUrlsFile', () => {
        beforeEach(() => {
            sandbox.stub(fs, 'writeJson').resolves();
        });

        it('should write json even if source paths are empty', () => {
            const destPath = '/foobar';
            const srcPaths = [];

            utils.writeDatabaseUrlsFile(destPath, srcPaths);

            assert.calledOnceWith(fs.writeJson, '/foobar/databaseUrls.json', {dbUrls: [], jsonUrls: []});
        });

        it('should not write invalid urls', () => {
            const destPath = '/foo';
            const srcPaths = [
                null,
                '',
                'foo',
                'foo.bar',
                'foo://bar/baz',
                'http://foo.bar/baz.bar?test=stub'
            ];

            utils.writeDatabaseUrlsFile(destPath, srcPaths);

            assert.calledOnceWith(fs.writeJson, sinon.match.any, {dbUrls: [], jsonUrls: []});
        });

        it('should write relative urls', () => {
            const destPath = '/foo';
            const srcPaths = ['bar.db', 'bar.json'];

            utils.writeDatabaseUrlsFile(destPath, srcPaths);

            assert.calledOnceWith(fs.writeJson, sinon.match.any, {dbUrls: ['bar.db'], jsonUrls: ['bar.json']});
        });

        it('should write absolute urls with search params', () => {
            const destPath = '/foo';
            const srcPaths = ['http://foo.bar/baz.db?test=stub', 'http://foo.bar/baz.json?test=stub'];

            utils.writeDatabaseUrlsFile(destPath, srcPaths);

            assert.calledOnceWith(fs.writeJson, sinon.match.any, {
                dbUrls: ['http://foo.bar/baz.db?test=stub'],
                jsonUrls: ['http://foo.bar/baz.json?test=stub']
            });
        });
    });

    describe('initializeCustomGui', () => {
        it('should initialize each group of controls if initialize-function is available', async () => {
            const initializeSpy1 = sinon.spy().named('initialize-1');
            const initializeSpy2 = sinon.spy().named('initialize-2');

            const initialize1 = sinon.stub().callsFake(() => Promise.delay(5).then(initializeSpy1));
            const initialize2 = sinon.stub().callsFake(() => Promise.delay(10).then(initializeSpy2));

            const ctx1 = {initialize: initialize1};
            const ctx2 = {initialize: initialize2};

            const pluginConfig = {
                customGui: {'section-1': [ctx1], 'section-2': [ctx2]}
            };
            const hermione = {};

            await utils.initializeCustomGui(hermione, pluginConfig);

            assert.calledOnceWith(initialize1, {hermione, ctx: ctx1});
            assert.calledOnceWith(initialize2, {hermione, ctx: ctx2});

            assert.callOrder(initializeSpy1, initializeSpy2);
        });
    });

    describe('runCustomGuiAction', () => {
        it('should run action for specified controls', async () => {
            const actionSpy = sinon.spy().named('action');
            const action = sinon.stub().callsFake(() => Promise.delay(10).then(actionSpy));
            const control = {};
            const ctx = {controls: [control], action};
            const pluginConfig = {customGui: {'section': [ctx]}};
            const hermione = {};

            await utils.runCustomGuiAction(hermione, pluginConfig, {
                sectionName: 'section',
                groupIndex: 0,
                controlIndex: 0
            });

            assert.calledOnceWith(action, {hermione, ctx, control});
            assert.calledOnce(actionSpy);
        });
    });

    describe('forEachPlugin', () => {
        it('should call the callback for each plugin only once', () => {
            const plugins = [
                {name: 'test-plugin-1'},
                {name: 'test-plugin-3'},
                {name: 'test-plugin-1'},
                {name: 'test-plugin-2'},
                {name: 'test-plugin-1'},
                {name: 'test-plugin-2'}
            ];

            const callback = sandbox.stub();

            utils.forEachPlugin(plugins, callback);

            assert.calledThrice(callback);
            assert.deepStrictEqual(callback.args, [
                ['test-plugin-1'],
                ['test-plugin-3'],
                ['test-plugin-2']
            ]);
        });
    });

    describe('mapPlugins', () => {
        it('should map the callback for each plugin only once', () => {
            const plugins = [
                {name: 'test-plugin-1'},
                {name: 'test-plugin-3'},
                {name: 'test-plugin-1'},
                {name: 'test-plugin-2'},
                {name: 'test-plugin-1'},
                {name: 'test-plugin-2'}
            ];

            const callback = pluginName => pluginName;

            const result = utils.mapPlugins(plugins, callback);

            assert.deepStrictEqual(result, [
                'test-plugin-1',
                'test-plugin-3',
                'test-plugin-2'
            ]);
        });
    });

    describe('isUnexpectedPlugin', () => {
        it('should return true when the specified plugin is not present in the plugins config', () => {
            const plugins = [
                {name: 'test-plugin-1'},
                {name: 'test-plugin-3'},
                {name: 'test-plugin-1'},
                {name: 'test-plugin-2'},
                {name: 'test-plugin-1'},
                {name: 'test-plugin-2'}
            ];

            const result = utils.isUnexpectedPlugin(plugins, 'test-plugin-5');

            assert.strictEqual(result, true);
        });

        it('should return false when the specified plugin is present in the plugins config', () => {
            const plugins = [
                {name: 'test-plugin-1'},
                {name: 'test-plugin-3'},
                {name: 'test-plugin-1'},
                {name: 'test-plugin-2'},
                {name: 'test-plugin-1'},
                {name: 'test-plugin-2'}
            ];

            const result = utils.isUnexpectedPlugin(plugins, 'test-plugin-3');

            assert.strictEqual(result, false);
        });
    });
});
