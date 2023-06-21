'use strict';

const _ = require('lodash');
const proxyquire = require('proxyquire');
const {FAIL, ERROR, SUCCESS} = require('lib/constants/test-statuses');
const {versions: browserVersions} = require('lib/constants/browser');

describe('ResultsTreeBuilder', () => {
    const sandbox = sinon.sandbox.create();
    let ResultsTreeBuilder, builder, determineStatus;

    const mkTestResult_ = (result) => {
        return _.defaults(result, {imagesInfo: [], metaInfo: {}});
    };

    const mkFormattedResult_ = (result) => {
        return _.defaults(result, {
            testPath: ['default-parent-suite', 'default-child-suite'],
            browserId: 'default-browser',
            attempt: 0
        });
    };

    beforeEach(() => {
        determineStatus = sandbox.stub().returns(SUCCESS);
        ResultsTreeBuilder = proxyquire('lib/tests-tree-builder/base', {
            '../common-utils': {determineStatus}
        });

        builder = ResultsTreeBuilder.create();
    });

    afterEach(() => sandbox.restore());

    describe('"sortTree" method', () => {
        it('should sort ids of root suites', () => {
            builder.addTestResult(mkTestResult_(), mkFormattedResult_({testPath: ['s2']}));
            builder.addTestResult(mkTestResult_(), mkFormattedResult_({testPath: ['s1']}));

            builder.sortTree();

            assert.deepEqual(builder.tree.suites.allRootIds, ['s1', 's2']);
        });

        it('should sort ids of child suites', () => {
            builder.addTestResult(mkTestResult_(), mkFormattedResult_({testPath: ['s1', 'ch2']}));
            builder.addTestResult(mkTestResult_(), mkFormattedResult_({testPath: ['s1', 'ch1']}));

            builder.sortTree();

            assert.deepEqual(builder.tree.suites.byId['s1'].suiteIds, ['s1 ch1', 's1 ch2']);
        });

        it('should sort ids of browsers', () => {
            builder.addTestResult(mkTestResult_(), mkFormattedResult_({testPath: ['s1'], browserId: 'b2'}));
            builder.addTestResult(mkTestResult_(), mkFormattedResult_({testPath: ['s1'], browserId: 'b1'}));

            builder.sortTree();

            assert.deepEqual(builder.tree.suites.byId['s1'].browserIds, ['s1 b1', 's1 b2']);
        });
    });

    describe('"addTestResult" method', () => {
        describe('"suites" field in the tree', () => {
            it('should collect all suite root ids', () => {
                builder.addTestResult(mkTestResult_(), mkFormattedResult_({testPath: ['s1', 's2']}));
                builder.addTestResult(mkTestResult_(), mkFormattedResult_({testPath: ['s3', 's4']}));

                assert.deepEqual(builder.tree.suites.allRootIds, ['s1', 's3']);
            });

            it('should collect all suite ids', () => {
                builder.addTestResult(mkTestResult_(), mkFormattedResult_({testPath: ['s1', 's2']}));
                builder.addTestResult(mkTestResult_(), mkFormattedResult_({testPath: ['s3', 's4']}));

                assert.deepEqual(builder.tree.suites.allIds, ['s1', 's1 s2', 's3', 's3 s4']);
            });

            it('should correctly init root suite', () => {
                builder.addTestResult(mkTestResult_(), mkFormattedResult_({testPath: ['s1', 's2']}));

                assert.deepEqual(
                    builder.tree.suites.byId['s1'],
                    {
                        id: 's1',
                        name: 's1',
                        parentId: null,
                        root: true,
                        suitePath: ['s1'],
                        status: SUCCESS,
                        suiteIds: ['s1 s2']
                    }
                );
            });

            it('should correctly init child suite', () => {
                builder.addTestResult(mkTestResult_(), mkFormattedResult_({testPath: ['s1', 's2'], browserId: 'b1'}));

                assert.deepEqual(
                    builder.tree.suites.byId['s1 s2'],
                    {
                        id: 's1 s2',
                        name: 's2',
                        parentId: 's1',
                        root: false,
                        suitePath: ['s1', 's2'],
                        status: SUCCESS,
                        browserIds: ['s1 s2 b1']
                    }
                );
            });
        });

        describe('"browsers" field in the tree', () => {
            it('should collect all browser ids', () => {
                builder.addTestResult(mkTestResult_(), mkFormattedResult_({testPath: ['s1'], browserId: 'b1'}));
                builder.addTestResult(mkTestResult_(), mkFormattedResult_({testPath: ['s2'], browserId: 'b2'}));

                assert.deepEqual(builder.tree.browsers.allIds, ['s1 b1', 's2 b2']);
            });

            it('should correctly init browser', () => {
                builder.addTestResult(mkTestResult_(), mkFormattedResult_({
                    testPath: ['s1'], browserId: 'b1', attempt: 0
                }));

                assert.deepEqual(
                    builder.tree.browsers.byId['s1 b1'],
                    {
                        id: 's1 b1',
                        name: 'b1',
                        parentId: 's1',
                        resultIds: ['s1 b1 0'],
                        version: browserVersions.UNKNOWN
                    }
                );
            });

            it('should collect all browser versions from results in browser', () => {
                const result1 = mkTestResult_({metaInfo: {browserVersion: '1'}});
                const result2 = mkTestResult_({metaInfo: {browserVersion: '1'}});

                builder.addTestResult(result1, mkFormattedResult_({
                    testPath: ['s1'], browserId: 'b1', attempt: 0
                }));
                builder.addTestResult(result2, mkFormattedResult_({
                    testPath: ['s1'], browserId: 'b1', attempt: 1
                }));

                assert.deepEqual(builder.tree.browsers.byId['s1 b1'].version, '1');
            });

            it('should collect all ids to test results in browser', () => {
                builder.addTestResult(mkTestResult_(), mkFormattedResult_({
                    testPath: ['s1'], browserId: 'b1', attempt: 0
                }));
                builder.addTestResult(mkTestResult_(), mkFormattedResult_({
                    testPath: ['s1'], browserId: 'b1', attempt: 1
                }));

                assert.deepEqual(builder.tree.browsers.byId['s1 b1'].resultIds, ['s1 b1 0', 's1 b1 1']);
            });
        });

        describe('"results" field in the tree', () => {
            it('should collect all test result ids', () => {
                builder.addTestResult(mkTestResult_(), mkFormattedResult_({
                    testPath: ['s1'], browserId: 'b1', attempt: 0
                }));
                builder.addTestResult(mkTestResult_(), mkFormattedResult_({
                    testPath: ['s2'], browserId: 'b2', attempt: 0
                }));

                assert.deepEqual(builder.tree.results.allIds, ['s1 b1 0', 's2 b2 0']);
            });

            it('should correctly init test result', () => {
                builder.addTestResult(mkTestResult_(), mkFormattedResult_(
                    {testPath: ['s1'], browserId: 'b1', attempt: 0}
                ));

                assert.deepEqual(
                    builder.tree.results.byId['s1 b1 0'],
                    {
                        id: 's1 b1 0',
                        parentId: 's1 b1',
                        imageIds: [],
                        metaInfo: {}
                    }
                );
            });

            it('should collect all ids to images in test result', () => {
                builder.addTestResult(
                    mkTestResult_({imagesInfo: [{stateName: 'img1'}, {stateName: 'img2'}]}),
                    mkFormattedResult_({testPath: ['s1'], browserId: 'b1', attempt: 0})
                );

                assert.deepEqual(
                    builder.tree.results.byId['s1 b1 0'].imageIds,
                    ['s1 b1 0 img1', 's1 b1 0 img2']
                );
            });
        });

        describe('"images" field in the tree', () => {
            it('should collect all images ids', () => {
                builder.addTestResult(
                    mkTestResult_({imagesInfo: [{stateName: 'img1'}]}),
                    mkFormattedResult_({testPath: ['s1'], browserId: 'b1', attempt: 0})
                );
                builder.addTestResult(
                    mkTestResult_({imagesInfo: [{status: ERROR}]}),
                    mkFormattedResult_({testPath: ['s2'], browserId: 'b2', attempt: 0})
                );

                assert.deepEqual(builder.tree.images.allIds, ['s1 b1 0 img1', `s2 b2 0 ${ERROR}_0`]);
            });

            it('should correctly init image results', () => {
                const imagesInfo = [{stateName: 'img1', foo: 'bar'}, {status: ERROR, bar: 'baz'}];
                builder.addTestResult(
                    mkTestResult_({imagesInfo}),
                    mkFormattedResult_({testPath: ['s1'], browserId: 'b1', attempt: 0})
                );

                assert.deepEqual(
                    builder.tree.images.byId['s1 b1 0 img1'],
                    {
                        id: 's1 b1 0 img1',
                        parentId: 's1 b1 0',
                        ...imagesInfo[0]
                    }
                );
                assert.deepEqual(
                    builder.tree.images.byId[`s1 b1 0 ${ERROR}_1`],
                    {
                        id: `s1 b1 0 ${ERROR}_1`,
                        parentId: 's1 b1 0',
                        ...imagesInfo[1]
                    }
                );
            });
        });

        describe('determine statuses for suites', () => {
            it('should call "determineStatus" with test result status', () => {
                builder.addTestResult(
                    mkTestResult_({status: SUCCESS}),
                    mkFormattedResult_({testPath: ['s1']})
                );

                assert.calledOnceWith(determineStatus, [SUCCESS]);
            });

            it('should call "determineStatus" with test result status from last attempt', () => {
                builder.addTestResult(
                    mkTestResult_({status: FAIL}),
                    mkFormattedResult_({testPath: ['s1'], attempt: 0})
                );
                builder.addTestResult(
                    mkTestResult_({status: SUCCESS}),
                    mkFormattedResult_({testPath: ['s1'], attempt: 1})
                );

                assert.calledWith(determineStatus.lastCall, [SUCCESS]);
            });

            it('should call "determineStatus" with all test statuses from each browser', () => {
                builder.addTestResult(
                    mkTestResult_({status: FAIL}),
                    mkFormattedResult_({testPath: ['s1'], browserId: 'b1'})
                );
                builder.addTestResult(
                    mkTestResult_({status: SUCCESS}),
                    mkFormattedResult_({testPath: ['s1'], browserId: 'b2'})
                );

                assert.calledWith(determineStatus.secondCall, [FAIL, SUCCESS]);
            });

            it('should call "determineStatus" with statuses from child suites', () => {
                determineStatus.withArgs([FAIL]).returns('s1 s2 status');
                determineStatus.withArgs([ERROR]).returns('s1 s3 status');
                builder.addTestResult(
                    mkTestResult_({status: FAIL}),
                    mkFormattedResult_({testPath: ['s1', 's2']})
                );
                builder.addTestResult(
                    mkTestResult_({status: ERROR}),
                    mkFormattedResult_({testPath: ['s1', 's3']})
                );

                assert.calledWith(determineStatus.getCall(3), ['s1 s2 status', 's1 s3 status']);
            });
        });
    });
});
