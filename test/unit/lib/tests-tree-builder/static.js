'use strict';

const _ = require('lodash');
const StaticResultsTreeBuilder = require('lib/tests-tree-builder/static');
const {SUCCESS} = require('lib/constants/test-statuses');
const {versions: browserVersions} = require('lib/constants/browser');

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

    const formatToTestResult = (result, data = {}) => {
        return {
            description: result.description,
            imagesInfo: result.imagesInfo,
            metaInfo: result.metaInfo,
            multipleTabs: result.multipleTabs,
            name: result.name,
            screenshot: result.screenshot,
            status: result.status,
            suiteUrl: result.suiteUrl,
            skipReason: result.skipReason,
            error: result.error,
            ...data
        };
    };

    beforeEach(() => {
        sandbox.stub(StaticResultsTreeBuilder.prototype, 'addTestResult');
        sandbox.stub(StaticResultsTreeBuilder.prototype, 'sortTree');
        sandbox.stub(StaticResultsTreeBuilder.prototype, 'convertToOldFormat').returns({});

        builder = StaticResultsTreeBuilder.create();
    });

    afterEach(() => sandbox.restore());

    describe('"build" method', () => {
        describe('should add test result for', () => {
            it('each passed row', () => {
                const dataFromDb1 = mkDataFromDb_({suitePath: ['s1'], name: 'yabro'});
                const dataFromDb2 = mkDataFromDb_({suitePath: ['s2'], name: 'yabro'});
                const rows = [mkDataRowFromDb_(dataFromDb1), mkDataRowFromDb_(dataFromDb2)];

                builder.build(rows);

                assert.calledWith(
                    StaticResultsTreeBuilder.prototype.addTestResult.firstCall,
                    formatToTestResult(dataFromDb1, {attempt: 0}),
                    {browserId: 'yabro', testPath: ['s1'], attempt: 0}
                );
                assert.calledWith(
                    StaticResultsTreeBuilder.prototype.addTestResult.secondCall,
                    formatToTestResult(dataFromDb2, {attempt: 0}),
                    {browserId: 'yabro', testPath: ['s2'], attempt: 0}
                );
            });

            it('the same test with increase attempt', () => {
                const dataFromDb1 = mkDataFromDb_({suitePath: ['s1'], name: 'yabro', timestamp: 10});
                const dataFromDb2 = mkDataFromDb_({suitePath: ['s1'], name: 'yabro', timestamp: 20});
                const rows = [mkDataRowFromDb_(dataFromDb1), mkDataRowFromDb_(dataFromDb2)];

                builder.build(rows);

                assert.calledWith(
                    StaticResultsTreeBuilder.prototype.addTestResult.firstCall,
                    formatToTestResult(dataFromDb1, {attempt: 0}),
                    {browserId: 'yabro', testPath: ['s1'], attempt: 0}
                );
                assert.calledWith(
                    StaticResultsTreeBuilder.prototype.addTestResult.secondCall,
                    formatToTestResult(dataFromDb1, {attempt: 1}),
                    {browserId: 'yabro', testPath: ['s1'], attempt: 1}
                );
            });
        });

        describe('should sort tree', () => {
            it('after add test result', () => {
                const rows = [mkDataRowFromDb_()];

                builder.build(rows);

                assert.callOrder(
                    StaticResultsTreeBuilder.prototype.addTestResult,
                    StaticResultsTreeBuilder.prototype.sortTree
                );
            });

            it('only once even if a few tests are added', () => {
                const rows = [mkDataRowFromDb_(), mkDataRowFromDb_()];

                builder.build(rows);

                assert.calledOnce(StaticResultsTreeBuilder.prototype.sortTree);
            });
        });

        describe('should return tests tree', () => {
            it('in old format by default', () => {
                StaticResultsTreeBuilder.prototype.convertToOldFormat.returns('old-format-tree');

                const {tree} = builder.build([]);

                assert.equal(tree, 'old-format-tree');
            });

            it('without formatting', () => {
                sandbox.stub(StaticResultsTreeBuilder.prototype, 'tree').get(() => 'tree');

                const {tree} = builder.build([], {convertToOldFormat: false});

                assert.notCalled(StaticResultsTreeBuilder.prototype.convertToOldFormat);
                assert.equal(tree, 'tree');
            });
        });

        describe('should return browsers', () => {
            it('with unknown version if it is not specified in metaInfo', () => {
                const dataFromDb = mkDataFromDb_({name: 'yabro', metaInfo: {}});
                const rows = [mkDataRowFromDb_(dataFromDb)];

                const {browsers} = builder.build(rows);

                assert.deepEqual(browsers, [{id: 'yabro', versions: [browserVersions.UNKNOWN]}]);
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
