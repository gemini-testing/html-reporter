'use strict';

const _ = require('lodash');
const proxyquire = require('proxyquire');
const {FAIL, ERROR, SUCCESS} = require('lib/constants/test-statuses');
const {BrowserVersions} = require('lib/constants/browser');
const {ToolName} = require('lib/constants');

describe('ResultsTreeBuilder', () => {
    const sandbox = sinon.sandbox.create();
    let ResultsTreeBuilder, builder, determineFinalStatus;

    const mkFormattedResult_ = (result) => {
        return _.defaults(result, {
            testPath: ['default-parent-suite', 'default-child-suite'],
            browserId: 'default-browser',
            attempt: 0,
            meta: {browserVersion: BrowserVersions.UNKNOWN}
        });
    };

    beforeEach(() => {
        determineFinalStatus = sandbox.stub().returns(SUCCESS);
        ResultsTreeBuilder = proxyquire('lib/tests-tree-builder/base', {
            '../common-utils': {determineFinalStatus}
        }).BaseTestsTreeBuilder;

        builder = ResultsTreeBuilder.create({toolName: ToolName.Testplane});
    });

    afterEach(() => sandbox.restore());

    describe('"sortTree" method', () => {
        it('should sort ids of root suites', () => {
            builder.addTestResult(mkFormattedResult_({testPath: ['s2']}));
            builder.addTestResult(mkFormattedResult_({testPath: ['s1']}));

            builder.sortTree();

            assert.deepEqual(builder.tree.suites.allRootIds, ['s1', 's2']);
        });

        it('should sort ids of child suites', () => {
            builder.addTestResult(mkFormattedResult_({testPath: ['s1', 'ch2']}));
            builder.addTestResult(mkFormattedResult_({testPath: ['s1', 'ch1']}));

            builder.sortTree();

            assert.deepEqual(builder.tree.suites.byId['s1'].suiteIds, ['s1 ch1', 's1 ch2']);
        });

        it('should sort ids of browsers', () => {
            builder.addTestResult(mkFormattedResult_({testPath: ['s1'], browserId: 'b2'}));
            builder.addTestResult(mkFormattedResult_({testPath: ['s1'], browserId: 'b1'}));

            builder.sortTree();

            assert.deepEqual(builder.tree.suites.byId['s1'].browserIds, ['s1 b1', 's1 b2']);
        });
    });

    describe('"addTestResult" method', () => {
        describe('"suites" field in the tree', () => {
            it('should collect all suite root ids', () => {
                builder.addTestResult(mkFormattedResult_({testPath: ['s1', 's2']}));
                builder.addTestResult(mkFormattedResult_({testPath: ['s3', 's4']}));

                assert.deepEqual(builder.tree.suites.allRootIds, ['s1', 's3']);
            });

            it('should collect all suite ids', () => {
                builder.addTestResult(mkFormattedResult_({testPath: ['s1', 's2']}));
                builder.addTestResult(mkFormattedResult_({testPath: ['s3', 's4']}));

                assert.deepEqual(builder.tree.suites.allIds, ['s1', 's1 s2', 's3', 's3 s4']);
            });

            it('should correctly init root suite', () => {
                builder.addTestResult(mkFormattedResult_({testPath: ['s1', 's2']}));

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
                builder.addTestResult(mkFormattedResult_({testPath: ['s1', 's2'], browserId: 'b1'}));

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

            it('should transform root suite into non-root suite', () => {
                builder.addTestResult(mkFormattedResult_({testPath: ['s1 s2', 's3']}));

                assert.deepEqual(
                    builder.tree.suites.byId['s1 s2'],
                    {
                        id: 's1 s2',
                        name: 's1 s2',
                        parentId: null,
                        root: true,
                        suitePath: ['s1 s2'],
                        status: SUCCESS,
                        suiteIds: ['s1 s2 s3']
                    }
                );

                builder.addTestResult(mkFormattedResult_({testPath: ['s1', 's2', 's4']}));

                assert.deepEqual(
                    builder.tree.suites.byId['s1 s2'],
                    {
                        id: 's1 s2',
                        name: 's2',
                        parentId: 's1',
                        root: false,
                        suitePath: ['s1', 's2'],
                        status: SUCCESS,
                        suiteIds: ['s1 s2 s3', 's1 s2 s4']
                    }
                );
            });

            it('should transform suite into child suite', () => {
                builder.addTestResult(mkFormattedResult_({testPath: ['s1', 's2 s3', 's4']}));

                assert.deepEqual(
                    builder.tree.suites.byId['s1 s2 s3'],
                    {
                        id: 's1 s2 s3',
                        name: 's2 s3',
                        parentId: 's1',
                        root: false,
                        suitePath: ['s1', 's2 s3'],
                        status: SUCCESS,
                        suiteIds: ['s1 s2 s3 s4']
                    }
                );

                builder.addTestResult(mkFormattedResult_({testPath: ['s1', 's2', 's3', 's5']}));

                assert.deepEqual(
                    builder.tree.suites.byId['s1 s2 s3'],
                    {
                        id: 's1 s2 s3',
                        name: 's3',
                        parentId: 's1 s2',
                        root: false,
                        suitePath: ['s1', 's2', 's3'],
                        status: SUCCESS,
                        suiteIds: ['s1 s2 s3 s4', 's1 s2 s3 s5']
                    }
                );
            });

            it('should merge suite into existing one', () => {
                builder.addTestResult(mkFormattedResult_({testPath: ['s1', 's2', 's3', 's4']}));
                builder.addTestResult(mkFormattedResult_({testPath: ['s1', 's2 s3', 's5']}));

                assert.deepEqual(
                    builder.tree.suites.byId['s1 s2 s3'],
                    {
                        id: 's1 s2 s3',
                        name: 's3',
                        parentId: 's1 s2',
                        root: false,
                        suitePath: ['s1', 's2', 's3'],
                        status: SUCCESS,
                        suiteIds: ['s1 s2 s3 s4', 's1 s2 s3 s5']
                    }
                );
            });
        });

        describe('"browsers" field in the tree', () => {
            it('should collect all browser ids', () => {
                builder.addTestResult(mkFormattedResult_({testPath: ['s1'], browserId: 'b1'}));
                builder.addTestResult(mkFormattedResult_({testPath: ['s2'], browserId: 'b2'}));

                assert.deepEqual(builder.tree.browsers.allIds, ['s1 b1', 's2 b2']);
            });

            it('should correctly init browser', () => {
                builder.addTestResult(mkFormattedResult_({
                    testPath: ['s1'], browserId: 'b1', attempt: 0
                }));

                assert.deepEqual(
                    builder.tree.browsers.byId['s1 b1'],
                    {
                        id: 's1 b1',
                        name: 'b1',
                        parentId: 's1',
                        resultIds: ['s1 b1 0'],
                        version: BrowserVersions.UNKNOWN
                    }
                );
            });

            it('should collect all browser versions from results in browser', () => {
                builder.addTestResult(mkFormattedResult_({
                    testPath: ['s1'], browserId: 'b1', attempt: 0, meta: {browserVersion: '1'}
                }));
                builder.addTestResult(mkFormattedResult_({
                    testPath: ['s1'], browserId: 'b1', attempt: 1, meta: {browserVersion: '1'}
                }));

                assert.deepEqual(builder.tree.browsers.byId['s1 b1'].version, '1');
            });

            it('should collect all ids to test results in browser', () => {
                builder.addTestResult(mkFormattedResult_({
                    testPath: ['s1'], browserId: 'b1', attempt: 0
                }));
                builder.addTestResult(mkFormattedResult_({
                    testPath: ['s1'], browserId: 'b1', attempt: 1
                }));

                assert.deepEqual(builder.tree.browsers.byId['s1 b1'].resultIds, ['s1 b1 0', 's1 b1 1']);
            });
        });

        describe('"results" field in the tree', () => {
            it('should collect all test result ids', () => {
                builder.addTestResult(mkFormattedResult_({
                    testPath: ['s1'], browserId: 'b1', attempt: 0
                }));
                builder.addTestResult(mkFormattedResult_({
                    testPath: ['s2'], browserId: 'b2', attempt: 0
                }));

                assert.deepEqual(builder.tree.results.allIds, ['s1 b1 0', 's2 b2 0']);
            });

            it('should correctly init test result', () => {
                builder.addTestResult(mkFormattedResult_(
                    {testPath: ['s1'], browserId: 'b1', attempt: 0}
                ));

                assert.deepEqual(
                    _.pick(builder.tree.results.byId['s1 b1 0'], ['attempt', 'id', 'parentId', 'imageIds', 'metaInfo']),
                    {
                        attempt: 0,
                        id: 's1 b1 0',
                        parentId: 's1 b1',
                        imageIds: [],
                        metaInfo: {browserVersion: BrowserVersions.UNKNOWN}
                    }
                );
            });

            it('should collect all ids to images in test result', () => {
                const imagesInfo = [{stateName: 'img1'}, {stateName: 'img2'}];
                builder.addTestResult(
                    mkFormattedResult_({testPath: ['s1'], browserId: 'b1', attempt: 0, imagesInfo})
                );

                assert.deepEqual(
                    builder.tree.results.byId['s1 b1 0'].imageIds,
                    ['s1 b1 0 img1', 's1 b1 0 img2']
                );
            });
        });

        describe('"images" field in the tree', () => {
            it('should collect all images ids', () => {
                const imagesInfo1 = [{stateName: 'img1'}];
                builder.addTestResult(
                    mkFormattedResult_({testPath: ['s1'], browserId: 'b1', attempt: 0, imagesInfo: imagesInfo1})
                );
                const imagesInfo2 = [{status: ERROR}];
                builder.addTestResult(
                    mkFormattedResult_({testPath: ['s2'], browserId: 'b2', attempt: 0, imagesInfo: imagesInfo2})
                );

                assert.deepEqual(builder.tree.images.allIds, ['s1 b1 0 img1', `s2 b2 0 ${ERROR}_0`]);
            });

            it('should correctly init image results', () => {
                const imagesInfo = [{stateName: 'img1', foo: 'bar'}, {status: ERROR, bar: 'baz'}];
                builder.addTestResult(
                    mkFormattedResult_({testPath: ['s1'], browserId: 'b1', attempt: 0, imagesInfo})
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
            it('should call "determineFinalStatus" with test result status', () => {
                builder.addTestResult(
                    mkFormattedResult_({status: SUCCESS, testPath: ['s1']})
                );

                assert.calledOnceWith(determineFinalStatus, [SUCCESS]);
            });

            it('should call "determineFinalStatus" with test result status from last attempt', () => {
                builder.addTestResult(
                    mkFormattedResult_({status: FAIL, testPath: ['s1'], attempt: 0})
                );
                builder.addTestResult(
                    mkFormattedResult_({status: SUCCESS, testPath: ['s1'], attempt: 1})
                );

                assert.calledWith(determineFinalStatus.lastCall, [SUCCESS]);
            });

            it('should call "determineFinalStatus" with all test statuses from each browser', () => {
                builder.addTestResult(
                    mkFormattedResult_({status: FAIL, testPath: ['s1'], browserId: 'b1'})
                );
                builder.addTestResult(
                    mkFormattedResult_({status: SUCCESS, testPath: ['s1'], browserId: 'b2'})
                );

                assert.calledWith(determineFinalStatus.secondCall, [FAIL, SUCCESS]);
            });

            it('should call "determineFinalStatus" with statuses from child suites', () => {
                determineFinalStatus.withArgs([FAIL]).returns('s1 s2 status');
                determineFinalStatus.withArgs([ERROR]).returns('s1 s3 status');
                builder.addTestResult(
                    mkFormattedResult_({status: FAIL, testPath: ['s1', 's2']})
                );
                builder.addTestResult(
                    mkFormattedResult_({status: ERROR, testPath: ['s1', 's3']})
                );

                assert.calledWith(determineFinalStatus.getCall(3), ['s1 s2 status', 's1 s3 status']);
            });
        });
    });
});
