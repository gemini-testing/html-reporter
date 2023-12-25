'use strict';

const _ = require('lodash');
const {StaticTestsTreeBuilder} = require('lib/tests-tree-builder/static');
const {SUCCESS} = require('lib/constants/test-statuses');
const {BrowserVersions} = require('lib/constants/browser');
const {ToolName} = require('lib/constants');

describe('StaticResultsTreeBuilder', () => {
    const sandbox = sinon.sandbox.create();
    let builder;

    const mkDataFromDb_ = (data) => {
        return _.defaults(data, {
            suitePath: ['default-parent-suite', 'default-child-suite'],
            suiteName: 'default-child-suite',
            name: 'default-browser',
            suiteUrl: 'default-url',
            metaInfo: {},
            history: [],
            description: 'default-descr',
            error: null,
            skipReason: '',
            imagesInfo: [],
            screenshot: true,
            multipleTabs: true,
            status: SUCCESS,
            timestamp: 100500
        });
    };

    const mkDataRowFromDb_ = (result = mkDataFromDb_()) => {
        return [
            JSON.stringify(result.suitePath),
            result.suiteName,
            result.name,
            result.suiteUrl,
            JSON.stringify(result.metaInfo),
            JSON.stringify(result.history),
            result.description,
            JSON.stringify(result.error),
            result.skipReason,
            JSON.stringify(result.imagesInfo),
            Number(result.screenshot),
            Number(result.multipleTabs),
            result.status,
            result.timestamp
        ];
    };

    const formatDbResultToTestResult = (result, overrides = {}) => {
        return {
            description: result.description,
            imagesInfo: result.imagesInfo,
            meta: result.metaInfo,
            history: result.history,
            multipleTabs: result.multipleTabs,
            browserId: result.name,
            status: result.status,
            url: result.suiteUrl,
            skipReason: result.skipReason,
            error: result.error,
            timestamp: result.timestamp,
            ...overrides
        };
    };

    const formatTestResult = (result) => _.pick(result, [
        'attempt',
        'description',
        'imagesInfo',
        'meta',
        'history',
        'multipleTabs',
        'browserId',
        'status',
        'url',
        'skipReason',
        'error',
        'timestamp'
    ]);

    beforeEach(() => {
        sandbox.stub(StaticTestsTreeBuilder.prototype, 'addTestResult');
        sandbox.stub(StaticTestsTreeBuilder.prototype, 'sortTree');

        builder = StaticTestsTreeBuilder.create({toolName: ToolName.Hermione});
    });

    afterEach(() => sandbox.restore());

    describe('"build" method', () => {
        describe('should add test result for', () => {
            it('each passed row', () => {
                const dataFromDb1 = mkDataFromDb_({suitePath: ['s1'], name: 'yabro'});
                const dataFromDb2 = mkDataFromDb_({suitePath: ['s2'], name: 'yabro'});
                const rows = [mkDataRowFromDb_(dataFromDb1), mkDataRowFromDb_(dataFromDb2)];

                builder.build(rows);

                assert.calledTwice(StaticTestsTreeBuilder.prototype.addTestResult);

                const actualTestResults = StaticTestsTreeBuilder.prototype.addTestResult
                    .getCalls()
                    .map(_.property('args.0'))
                    .map(formatTestResult);
                const expectedTestResults = [dataFromDb1, dataFromDb2].map(r => formatDbResultToTestResult(r, {attempt: 0}));
                assert.deepEqual(actualTestResults, expectedTestResults);
            });

            it('the same test with increased attempt', () => {
                const dataFromDb1 = mkDataFromDb_({suitePath: ['s1'], name: 'yabro', timestamp: 10});
                const dataFromDb2 = mkDataFromDb_({suitePath: ['s1'], name: 'yabro', timestamp: 20});
                const rows = [mkDataRowFromDb_(dataFromDb1), mkDataRowFromDb_(dataFromDb2)];

                builder.build(rows);

                assert.calledTwice(StaticTestsTreeBuilder.prototype.addTestResult);

                const actualTestResults = StaticTestsTreeBuilder.prototype.addTestResult
                    .getCalls()
                    .map(_.property('args.0'))
                    .map(formatTestResult);
                const expectedTestResults = [
                    formatDbResultToTestResult(dataFromDb1, {attempt: 0}),
                    formatDbResultToTestResult(dataFromDb2, {attempt: 1})
                ];
                assert.deepEqual(actualTestResults, expectedTestResults);
            });
        });

        describe('should sort tree', () => {
            it('after add test result', () => {
                const rows = [mkDataRowFromDb_()];

                builder.build(rows);

                assert.callOrder(
                    StaticTestsTreeBuilder.prototype.addTestResult,
                    StaticTestsTreeBuilder.prototype.sortTree
                );
            });

            it('only once even if a few tests are added', () => {
                const rows = [mkDataRowFromDb_(), mkDataRowFromDb_()];

                builder.build(rows);

                assert.calledOnce(StaticTestsTreeBuilder.prototype.sortTree);
            });
        });

        it('should return tests tree', () => {
            sandbox.stub(StaticTestsTreeBuilder.prototype, 'tree').get(() => 'tree');

            const {tree} = builder.build([]);

            assert.equal(tree, 'tree');
        });

        describe('should return browsers', () => {
            it('with unknown version if it is not specified in metaInfo', () => {
                const dataFromDb = mkDataFromDb_({name: 'yabro', metaInfo: {}});
                const rows = [mkDataRowFromDb_(dataFromDb)];

                const {browsers} = builder.build(rows);

                assert.deepEqual(browsers, [{id: 'yabro', versions: [BrowserVersions.UNKNOWN]}]);
            });

            it('with a few versions for the same browser', () => {
                const dataFromDb1 = mkDataFromDb_({name: 'yabro', metaInfo: {browserVersion: '1'}});
                const dataFromDb2 = mkDataFromDb_({name: 'yabro', metaInfo: {browserVersion: '2'}});
                const rows = [mkDataRowFromDb_(dataFromDb1), mkDataRowFromDb_(dataFromDb2)];

                const {browsers} = builder.build(rows);

                assert.deepEqual(browsers, [{id: 'yabro', versions: ['1', '2']}]);
            });

            it('with versions for different browsers', () => {
                const dataFromDb1 = mkDataFromDb_({name: 'yabro1', metaInfo: {browserVersion: '1'}});
                const dataFromDb2 = mkDataFromDb_({name: 'yabro2', metaInfo: {browserVersion: '2'}});
                const rows = [mkDataRowFromDb_(dataFromDb1), mkDataRowFromDb_(dataFromDb2)];

                const {browsers} = builder.build(rows);

                assert.deepEqual(browsers, [
                    {id: 'yabro1', versions: ['1']},
                    {id: 'yabro2', versions: ['2']}
                ]);
            });
        });
    });
});
