'use strict';

const fs = require('fs-extra');
const {tmpdir} = require('node:os');
const path = require('node:path');
const {TestplaneTestAdapter} = require('lib/adapters/test/testplane');
const {copyAndUpdate} = require('lib/adapters/test-result/utils');
const {IDLE, SKIPPED, SUCCESS, FAIL, ToolName, DB_COLUMN_INDEXES} = require('lib/constants');
const {ToolRunner} = require('lib/gui/tool-runner');
const {ImagesInfoSaver} = require('lib/images-info-saver');
const {HtmlReporter} = require('lib/plugin-api');
const {GuiReportBuilder} = require('lib/report-builder/gui');
const {SqliteClient} = require('lib/sqlite-client');

describe('GUI skip status restoration', () => {
    const sandbox = sinon.createSandbox();
    let reportPath, testFile, htmlReporter, toolAdapter, tests, runner;

    const mkTest = ({pending = false, browserId = 'chrome', skipReason = 'current reason'} = {}) => {
        const test = {
            id: 'test-id',
            title: 'test with spaces',
            parent: {
                title: 'suite with spaces',
                root: false,
                parent: {
                    title: '',
                    root: true,
                    parent: null
                }
            },
            file: testFile,
            browserId,
            pending,
            skipReason,
            fullTitle: () => 'suite with spaces test with spaces',
            clone() {
                return {...this};
            }
        };

        return TestplaneTestAdapter.create(test);
    };

    const seedHistory = async (statuses, browserId = 'chrome', {reuse = false, imagesInfo = [], timestamp} = {}) => {
        const dbClient = await SqliteClient.create({
            htmlReporter,
            reportPath,
            reuse
        });
        const test = mkTest({browserId});

        statuses.forEach((status, attempt) => dbClient.write(copyAndUpdate(test.createTestResult({
            status,
            duration: 1
        }), {
            timestamp: timestamp ?? attempt + 1,
            imagesInfo: status === SUCCESS ? imagesInfo : [],
            meta: {
                marker: 'saved metadata'
            }
        })));

        dbClient.close();
    };

    const start = async () => {
        runner = ToolRunner.create({
            paths: [testFile],
            toolAdapter,
            cli: {
                tool: {},
                options: {}
            }
        });

        await runner.initialize();
    };

    const refresh = async mode => {
        if (mode === 'restart') {
            await runner.finalize();
            runner = null;
            await start();
        } else if (mode === 'refresh') {
            await runner.refreshTests();
        } else {
            await runner.refreshTestsIfChanged([testFile], [], () => {}, () => {});
        }
    };

    const getResults = (browserId = 'chrome') => {
        const {tree} = runner.tree;
        const browser = tree.browsers.byId[`suite with spaces test with spaces ${browserId}`];

        return browser.resultIds.filter(Boolean).map(id => ({
            status: tree.results.byId[id].status,
            attempt: tree.results.byId[id].attempt
        }));
    };

    beforeEach(async () => {
        reportPath = await fs.mkdtemp(path.join(tmpdir(), 'html-reporter-skips-'));
        testFile = path.join(reportPath, 'test.js');
        await fs.writeFile(testFile, '');

        htmlReporter = HtmlReporter.create({
            path: reportPath,
            baseHost: ''
        });
        tests = [mkTest()];
        toolAdapter = {
            toolName: ToolName.Testplane,
            reporterConfig: {
                path: reportPath,
                baseHost: ''
            },
            htmlReporter,
            browserFeatures: {},
            readTests: async () => ({tests}),
            handleTestResults() {}
        };
        runner = null;

        sandbox.stub(GuiReportBuilder.prototype, 'saveStaticFiles').resolves();
        sandbox.stub(ImagesInfoSaver.prototype, 'save').callsFake(async result => result);
    });

    afterEach(async () => {
        if (runner) {
            await runner.finalize();
        }

        sandbox.restore();
        await fs.remove(reportPath);
    });

    ['restart', 'refresh', 'watch'].forEach(mode => {
        describe(mode, () => {
            it('should unskip a test without consuming an attempt', async () => {
                await seedHistory([SKIPPED]);
                tests = [mkTest({pending: true})];
                await start();

                tests = [mkTest()];
                await refresh(mode);

                assert.deepEqual(getResults(), [{
                    status: IDLE,
                    attempt: 0
                }]);
                assert.deepEqual(runner.tree.skips, []);

                await runner._reportBuilder.addTestResult(tests[0].createTestResult({
                    status: SUCCESS,
                    duration: 1
                }));

                assert.deepEqual(getResults(), [{
                    status: SUCCESS,
                    attempt: 0
                }]);

                await refresh('restart');

                assert.deepEqual(getResults(), [{
                    status: SUCCESS,
                    attempt: 0
                }]);
            });

            it('should preserve earlier attempts when removing a trailing skip', async () => {
                await seedHistory([FAIL, SKIPPED, SUCCESS, SKIPPED], 'chrome', {
                    imagesInfo: [{
                        stateName: 'screenshot',
                        status: SUCCESS,
                        expectedImg: {
                            path: 'saved-reference.png'
                        }
                    }]
                });
                tests = [mkTest({pending: true})];
                await start();

                tests = [mkTest()];
                await refresh(mode);

                assert.deepEqual(getResults(), [
                    {
                        status: FAIL,
                        attempt: 0
                    },
                    {
                        status: SKIPPED,
                        attempt: 1
                    },
                    {
                        status: SUCCESS,
                        attempt: 2
                    }
                ]);
                assert.equal(runner.tree.tree.suites.byId['suite with spaces'].status, SUCCESS);

                const result = runner.tree.tree.results.byId['suite with spaces test with spaces chrome 2'];

                assert.equal(result.metaInfo.marker, 'saved metadata');
                assert.deepEqual(result.imageIds, ['suite with spaces test with spaces chrome 2 screenshot']);
                assert.equal(runner.tree.tree.images.byId[result.imageIds[0]].expectedImg.path, 'saved-reference.png');
            });

            it('should skip an executed test without duplicating skipped attempts', async () => {
                await seedHistory([SUCCESS]);
                await start();

                tests = [mkTest({pending: true})];
                await refresh(mode);
                await refresh(mode);

                assert.deepEqual(getResults(), [
                    {
                        status: SUCCESS,
                        attempt: 0
                    },
                    {
                        status: SKIPPED,
                        attempt: 1
                    }
                ]);
                assert.deepEqual(runner.tree.skips, [{
                    suite: 'suite with spaces test with spaces',
                    browser: 'chrome',
                    comment: 'current reason'
                }]);
            });
        });
    });

    it('should remove obsolete skip entries when a watched test is deleted', async () => {
        tests = [mkTest({pending: true})];
        await start();

        tests = [];
        await refresh('watch');

        assert.deepEqual(runner.tree.skips, []);
        assert.deepEqual(runner.tree.tree.browsers.allIds, []);
    });

    it('should restore live results before a database file has been saved', async () => {
        await start();
        await runner._reportBuilder.addTestResult(tests[0].createTestResult({
            status: SUCCESS,
            duration: 1
        }));

        await refresh('refresh');

        assert.deepEqual(getResults(), [{
            status: SUCCESS,
            attempt: 0
        }]);
    });

    it('should remove a fresh skip before a database file has been saved', async () => {
        tests = [mkTest({pending: true})];
        await start();

        tests = [mkTest()];
        await refresh('refresh');
        await runner._reportBuilder.addTestResult(tests[0].createTestResult({
            status: SUCCESS,
            duration: 1
        }));
        await refresh('restart');

        assert.deepEqual(getResults(), [{
            status: SUCCESS,
            attempt: 0
        }]);
    });

    it('should remove only the trailing skip when timestamps are equal', async () => {
        await seedHistory([SKIPPED, SUCCESS, SKIPPED], 'chrome', {
            timestamp: 1
        });
        await start();
        await refresh('restart');

        assert.deepEqual(getResults(), [
            {
                status: SKIPPED,
                attempt: 0
            },
            {
                status: SUCCESS,
                attempt: 1
            }
        ]);
    });

    it('should not duplicate the latest skip when timestamps are equal', async () => {
        await seedHistory([SUCCESS, SKIPPED], 'chrome', {
            timestamp: 1
        });
        tests = [mkTest({pending: true})];
        await start();
        await refresh('restart');

        assert.deepEqual(getResults(), [
            {
                status: SUCCESS,
                attempt: 0
            },
            {
                status: SKIPPED,
                attempt: 1
            }
        ]);
        assert.lengthOf(runner._reportBuilder._dbClient.getAllSuites(), 2);
    });

    it('should resolve skip statuses independently for each browser', async () => {
        await seedHistory([SKIPPED]);
        await seedHistory([SUCCESS], 'firefox', {
            reuse: true
        });
        tests = [mkTest({pending: true}), mkTest({browserId: 'firefox'})];
        await start();

        tests = [mkTest(), mkTest({browserId: 'firefox'})];
        await refresh('watch');

        assert.deepEqual(getResults(), [{
            status: IDLE,
            attempt: 0
        }]);
        assert.deepEqual(getResults('firefox'), [{
            status: SUCCESS,
            attempt: 0
        }]);
        assert.deepEqual(runner.tree.skips, []);
    });

    it('should restore skip statuses and saved history if a watched update fails', async () => {
        await seedHistory([SKIPPED]);
        await seedHistory([SUCCESS], 'firefox', {
            reuse: true
        });
        tests = [mkTest({pending: true}), mkTest({browserId: 'firefox'})];
        await start();

        const firefox = mkTest({
            browserId: 'firefox',
            pending: true
        });
        const createTestResult = firefox.createTestResult.bind(firefox);
        sandbox.stub(firefox, 'createTestResult').callsFake(options => {
            if (options.status === SKIPPED) {
                throw new Error('invalid test result');
            }

            return createTestResult(options);
        });
        tests = [mkTest(), firefox];

        await assert.isRejected(refresh('watch'), 'invalid test result');

        assert.deepEqual(getResults(), [{
            status: SKIPPED,
            attempt: 0
        }]);
        assert.deepEqual(getResults('firefox'), [{
            status: SUCCESS,
            attempt: 0
        }]);
        assert.deepEqual(runner.tree.skips, [{
            suite: 'suite with spaces test with spaces',
            browser: 'chrome',
            comment: 'current reason'
        }]);

        const rows = runner._reportBuilder._dbClient.getAllSuites();

        assert.deepEqual(rows.map(row => [row[DB_COLUMN_INDEXES.name], row[DB_COLUMN_INDEXES.status]]), [
            ['chrome', SKIPPED],
            ['firefox', SUCCESS]
        ]);
    });

    it('should not roll back a result written after reconciliation rejects', async () => {
        await start();
        const pendingTest = mkTest({pending: true});
        sandbox.stub(pendingTest, 'createTestResult').throws(new Error('invalid test result'));

        const reconciliation = runner._reportBuilder.resolveSkippedTests([pendingTest]);
        const result = mkTest({browserId: 'firefox'}).createTestResult({
            status: SUCCESS,
            duration: 1
        });
        const dbClient = runner._reportBuilder._dbClient;
        dbClient.write(result);

        await assert.isRejected(reconciliation, 'invalid test result');

        const rows = dbClient.getAllSuites();

        assert.deepEqual(rows.map(row => [row[DB_COLUMN_INDEXES.name], row[DB_COLUMN_INDEXES.status]]), [
            ['firefox', SUCCESS]
        ]);
    });
});
