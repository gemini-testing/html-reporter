'use strict';

const _ = require('lodash');
const {GuiTestsTreeBuilder} = require('lib/tests-tree-builder/gui');
const {FAIL, SUCCESS, IDLE, UPDATED} = require('lib/constants/test-statuses');
const {ToolName} = require('lib/constants');

describe('GuiResultsTreeBuilder', () => {
    let builder;

    const mkFormattedResult_ = (result) => {
        return _.defaults(result, {
            testPath: ['default-parent-suite', 'default-child-suite'],
            browserId: 'default-browser',
            attempt: 0,
            meta: {browserVersion: 'some-version'}
        });
    };

    const mkGuiTreeBuilder = () => GuiTestsTreeBuilder.create({toolName: ToolName.Testplane});

    beforeEach(() => {
        builder = mkGuiTreeBuilder();
    });

    describe('"getImagesInfo" method', () => {
        it('should return images from tree for passed test result id', () => {
            const imagesInfo = [{stateName: 'image-1'}, {stateName: 'image-2'}];
            const formattedRes = mkFormattedResult_({testPath: ['s'], browserId: 'b', attempt: 0, imagesInfo});
            builder.addTestResult(formattedRes);

            const gotImagesInfo = builder.getImagesInfo('s b 0');

            assert.deepEqual(
                gotImagesInfo,
                [
                    builder.tree.images.byId['s b 0 image-1'],
                    builder.tree.images.byId['s b 0 image-2']
                ]
            );
        });
    });

    describe('"reuseTestsTree" method', () => {
        describe('reuse browsers', () => {
            it('should not reuse browser result if browser ids are not matched', () => {
                const srcBuilder = mkGuiTreeBuilder();
                srcBuilder.addTestResult(
                    mkFormattedResult_({testPath: ['s1'], browserId: 'b1', attempt: 0})
                );

                builder.addTestResult(
                    mkFormattedResult_({testPath: ['s1'], browserId: 'b2', attempt: 0})
                );

                builder.reuseTestsTree(srcBuilder.tree);

                assert.notDeepEqual(builder.tree.browsers.byId['s1 b2'], srcBuilder.tree.browsers.byId['s1 b1']);
                assert.isUndefined(builder.tree.results.byId['s1 b1']);
            });

            it('should reuse browser result from the passed tree if browser ids matched', () => {
                const srcBuilder = mkGuiTreeBuilder();
                srcBuilder.addTestResult(
                    mkFormattedResult_({testPath: ['s1'], browserId: 'b1', attempt: 0})
                );

                builder.addTestResult(
                    mkFormattedResult_({testPath: ['s1'], browserId: 'b1', attempt: 0})
                );

                builder.reuseTestsTree(srcBuilder.tree);

                assert.deepEqual(builder.tree.browsers.byId['s1 b1'], srcBuilder.tree.browsers.byId['s1 b1']);
            });
        });

        describe('reuse test results', () => {
            it('should not reuse result if browser ids does not matched', () => {
                const srcBuilder = mkGuiTreeBuilder();
                srcBuilder.addTestResult(
                    mkFormattedResult_({status: FAIL, testPath: ['s1'], browserId: 'b1', attempt: 0})
                );

                builder.addTestResult(
                    mkFormattedResult_({status: IDLE, testPath: ['s1'], browserId: 'b2', attempt: 0})
                );

                builder.reuseTestsTree(srcBuilder.tree);

                assert.notDeepEqual(builder.tree.results.byId['s1 b2 0'], srcBuilder.tree.results.byId['s1 b1 0']);
                assert.isUndefined(builder.tree.results.byId['s1 b1 0']);
            });

            it('should reuse all results from the passed tree if browser ids matched', () => {
                const srcBuilder = mkGuiTreeBuilder();
                srcBuilder.addTestResult(
                    mkFormattedResult_({status: FAIL, testPath: ['s1'], browserId: 'b1', attempt: 0})
                );
                srcBuilder.addTestResult(
                    mkFormattedResult_({status: SUCCESS, testPath: ['s1'], browserId: 'b1', attempt: 1})
                );

                builder.addTestResult(
                    mkFormattedResult_({status: IDLE, testPath: ['s1'], browserId: 'b1', attempt: 0})
                );

                builder.reuseTestsTree(srcBuilder.tree);

                assert.deepEqual(builder.tree.results.byId['s1 b1 0'], srcBuilder.tree.results.byId['s1 b1 0']);
                assert.deepEqual(builder.tree.results.byId['s1 b1 1'], srcBuilder.tree.results.byId['s1 b1 1']);
            });

            it('should register reused result ids', () => {
                const srcBuilder = mkGuiTreeBuilder();
                srcBuilder.addTestResult(
                    mkFormattedResult_({testPath: ['s1'], browserId: 'b1', attempt: 1})
                );

                builder.addTestResult(
                    mkFormattedResult_({testPath: ['s1'], browserId: 'b1', attempt: 0})
                );

                builder.reuseTestsTree(srcBuilder.tree);

                assert.deepEqual(builder.tree.results.allIds, ['s1 b1 0', 's1 b1 1']);
            });
        });

        describe('reuse images', () => {
            it('should not reuse images if browser ids does not matched', () => {
                const srcBuilder = mkGuiTreeBuilder();
                srcBuilder.addTestResult(
                    mkFormattedResult_({testPath: ['s1'], browserId: 'b1', attempt: 0, imagesInfo: [{stateName: 'img1'}]})
                );

                builder.addTestResult(
                    mkFormattedResult_({testPath: ['s1'], browserId: 'b2', attempt: 0, imagesInfo: [{stateName: 'img1'}]})
                );

                builder.reuseTestsTree(srcBuilder.tree);

                assert.notDeepEqual(builder.tree.images.byId['s1 b2 0 img1'], srcBuilder.tree.images.byId['s1 b1 0 img1']);
                assert.isUndefined(builder.tree.results.byId['s1 b1 0']);
            });

            it('should reuse all images from the passed tree if browser ids matched', () => {
                const srcBuilder = mkGuiTreeBuilder();
                const imagesInfo1 = [{stateName: 'img1'}, {stateName: 'img2'}];
                srcBuilder.addTestResult(
                    mkFormattedResult_({testPath: ['s1'], browserId: 'b1', attempt: 0, imagesInfo: imagesInfo1})
                );

                const imagesInfo2 = [{stateName: 'img1'}];
                builder.addTestResult(
                    mkFormattedResult_({testPath: ['s1'], browserId: 'b1', attempt: 0, imagesInfo: imagesInfo2})
                );

                builder.reuseTestsTree(srcBuilder.tree);

                assert.deepEqual(builder.tree.images.byId['s1 b1 0 img1'], srcBuilder.tree.images.byId['s1 b1 0 img1']);
                assert.deepEqual(builder.tree.images.byId['s1 b1 0 img2'], srcBuilder.tree.images.byId['s1 b1 0 img2']);
            });

            it('should register reused images ids', () => {
                const srcBuilder = mkGuiTreeBuilder();
                const imagesInfo = [{stateName: 'img1'}, {stateName: 'img2'}];
                srcBuilder.addTestResult(
                    mkFormattedResult_({testPath: ['s1'], browserId: 'b1', attempt: 0, imagesInfo})
                );

                builder.addTestResult(
                    mkFormattedResult_({testPath: ['s1'], browserId: 'b1', attempt: 0})
                );

                builder.reuseTestsTree(srcBuilder.tree);

                assert.deepEqual(builder.tree.images.allIds, ['s1 b1 0 img1', 's1 b1 0 img2']);
            });
        });

        describe('reuse suite status', () => {
            it('should not reuse suite status if browser ids does not matched', () => {
                const srcBuilder = mkGuiTreeBuilder();
                srcBuilder.addTestResult(
                    mkFormattedResult_({status: FAIL, testPath: ['s1'], browserId: 'b1', attempt: 0})
                );

                builder.addTestResult(
                    mkFormattedResult_({status: IDLE, testPath: ['s1'], browserId: 'b2', attempt: 0})
                );

                builder.reuseTestsTree(srcBuilder.tree);

                assert.equal(builder.tree.suites.byId['s1'].status, IDLE);
            });

            it('should reuse suite status from passed tree with if browser ids matched', () => {
                const srcBuilder = mkGuiTreeBuilder();
                srcBuilder.addTestResult(
                    mkFormattedResult_({status: FAIL, testPath: ['s1'], browserId: 'b1', attempt: 0})
                );

                builder.addTestResult(
                    mkFormattedResult_({status: IDLE, testPath: ['s1'], browserId: 'b1', attempt: 0})
                );

                builder.reuseTestsTree(srcBuilder.tree);

                assert.equal(builder.tree.suites.byId['s1'].status, FAIL);
            });
        });
    });

    describe('"getTestBranch" method', () => {
        it('should return "suites" as array for root suite', () => {
            builder.addTestResult(
                mkFormattedResult_({status: IDLE, testPath: ['s'], browserId: 'b', attempt: 0})
            );

            const {suites} = builder.getTestBranch('s b 0');

            assert.deepEqual(suites, [{id: 's', status: IDLE}]);
        });
    });

    describe('"getResultDataToUnacceptImage" method', () => {
        it('should return "shouldRemoveResult: true" if it is the only updated image in result', () => {
            const formattedRes1 = mkFormattedResult_({testPath: ['s'], browserId: 'b', attempt: 0, imagesInfo: [
                {stateName: 'foo', status: FAIL}]
            });
            const formattedRes2 = mkFormattedResult_({testPath: ['s'], browserId: 'b', attempt: 1, imagesInfo: [
                {stateName: 'foo', status: UPDATED}]
            });

            builder.addTestResult(formattedRes1);
            builder.addTestResult(formattedRes2);

            const {shouldRemoveResult} = builder.getResultDataToUnacceptImage('s b 1', 'foo');

            assert.isTrue(shouldRemoveResult);
        });

        it('should return "shouldRemoveResult: false" if it is not the only updated image in result', () => {
            const imagesInfo1 = [{stateName: 'foo', status: FAIL}, {stateName: 'bar', status: FAIL}];
            const imagesInfo2 = [{stateName: 'foo', status: UPDATED}, {stateName: 'bar', status: UPDATED}];
            const formattedRes1 = mkFormattedResult_({testPath: ['s'], browserId: 'b', attempt: 0, imagesInfo: imagesInfo1});
            const formattedRes2 = mkFormattedResult_({testPath: ['s'], browserId: 'b', attempt: 1, imagesInfo: imagesInfo2});

            builder.addTestResult(formattedRes1);
            builder.addTestResult(formattedRes2);

            const {shouldRemoveResult} = builder.getResultDataToUnacceptImage('s b 1', 'foo');

            assert.isFalse(shouldRemoveResult);
        });
    });
});
