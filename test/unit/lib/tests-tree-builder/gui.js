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

            it('should replace temporary results when explicitly requested', () => {
                const srcBuilder = mkGuiTreeBuilder();
                srcBuilder.addTestResult(
                    mkFormattedResult_({status: SUCCESS, testPath: ['s1'], browserId: 'b1', attempt: 0})
                );

                builder.addTestResult(
                    mkFormattedResult_({status: IDLE, testPath: ['s1'], browserId: 'b1', attempt: 1})
                );

                builder.reuseTestsTree(srcBuilder.tree, {replaceCurrentResults: true});

                assert.deepEqual(builder.tree.browsers.byId['s1 b1'].resultIds, ['s1 b1 0']);
                assert.deepEqual(builder.tree.results.allIds, ['s1 b1 0']);
                assert.isUndefined(builder.tree.results.byId['s1 b1 1']);
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

    describe('"removeTestsByFiles" method', () => {
        it('should remove only branches from passed files and prune empty suites', () => {
            builder.addTestResult(mkFormattedResult_({
                status: IDLE,
                file: '/project/changed.ts',
                testPath: ['root', 'changed'],
                browserId: 'chrome'
            }));
            builder.addTestResult(mkFormattedResult_({
                status: IDLE,
                file: '/project/unchanged.ts',
                testPath: ['root', 'unchanged'],
                browserId: 'chrome'
            }));

            builder.removeTestsByFiles(['/project/changed.ts']);

            assert.isUndefined(builder.tree.suites.byId['root changed']);
            assert.isUndefined(builder.tree.browsers.byId['root changed chrome']);
            assert.isUndefined(builder.tree.results.byId['root changed chrome 0']);
            assert.exists(builder.tree.suites.byId['root unchanged']);
            assert.exists(builder.tree.browsers.byId['root unchanged chrome']);
            assert.exists(builder.tree.results.byId['root unchanged chrome 0']);
        });

        it('should remove an empty root suite', () => {
            builder.addTestResult(mkFormattedResult_({
                status: IDLE,
                file: '/project/only.ts',
                testPath: ['only root'],
                browserId: 'chrome'
            }));

            builder.removeTestsByFiles(['/project/only.ts']);

            assert.deepEqual(builder.tree.suites.allRootIds, []);
            assert.deepEqual(builder.tree.suites.allIds, []);
            assert.deepEqual(builder.tree.browsers.allIds, []);
            assert.deepEqual(builder.tree.results.allIds, []);
        });

        it('should prune multiple sibling branches in one batch', () => {
            builder.addTestResult(mkFormattedResult_({
                status: IDLE,
                file: '/project/first.ts',
                testPath: ['root', 'group', 'first'],
                browserId: 'chrome'
            }));
            builder.addTestResult(mkFormattedResult_({
                status: IDLE,
                file: '/project/second.ts',
                testPath: ['root', 'group', 'second'],
                browserId: 'chrome'
            }));
            builder.addTestResult(mkFormattedResult_({
                status: SUCCESS,
                file: '/project/remaining.ts',
                testPath: ['root', 'remaining'],
                browserId: 'chrome'
            }));

            builder.removeTestsByFiles(['/project/first.ts', '/project/second.ts']);

            assert.notExists(builder.tree.suites.byId['root group first']);
            assert.notExists(builder.tree.suites.byId['root group second']);
            assert.notExists(builder.tree.suites.byId['root group']);
            assert.exists(builder.tree.suites.byId['root remaining']);
            assert.deepEqual(builder.tree.suites.byId.root.suiteIds, ['root remaining']);
            assert.equal(builder.tree.suites.byId.root.status, SUCCESS);
        });
    });

    describe('snapshot and restore', () => {
        it('should restore both tree and file index', () => {
            const file = '/project/test.ts';
            builder.addTestResult(mkFormattedResult_({
                status: IDLE,
                file,
                testPath: ['test'],
                browserId: 'chrome'
            }));
            const snapshot = builder.snapshotState();

            builder.removeTestsByFiles([file]);
            builder.restoreState(snapshot);
            builder.removeTestsByFiles([file]);

            assert.deepEqual(builder.tree.suites.allIds, []);
            assert.deepEqual(builder.tree.browsers.allIds, []);
            assert.deepEqual(builder.tree.results.allIds, []);
        });

        it('should restore only scoped branches and remove newly added nodes', () => {
            const changedFile = '/project/changed.ts';
            const unchangedFile = '/project/unchanged.ts';
            builder.addTestResult(mkFormattedResult_({
                status: IDLE,
                file: changedFile,
                testPath: ['root', 'changed'],
                browserId: 'chrome'
            }));
            builder.addTestResult(mkFormattedResult_({
                status: SUCCESS,
                file: unchangedFile,
                testPath: ['root', 'unchanged'],
                browserId: 'chrome'
            }));
            const scope = {
                suites: new Set(['root', 'root changed']),
                browsers: new Set(['root changed chrome']),
                results: new Set(['root changed chrome 0']),
                images: new Set()
            };
            const snapshot = builder.snapshotState(scope, [changedFile]);

            builder.removeTestsByFiles([changedFile]);
            builder.addTestResult(mkFormattedResult_({
                status: IDLE,
                file: changedFile,
                testPath: ['root', 'replacement'],
                browserId: 'firefox'
            }));
            scope.suites.add('root replacement');
            scope.browsers.add('root replacement firefox');
            scope.results.add('root replacement firefox 0');
            builder.restoreState(snapshot);

            assert.exists(builder.tree.suites.byId['root changed']);
            assert.exists(builder.tree.browsers.byId['root changed chrome']);
            assert.exists(builder.tree.results.byId['root changed chrome 0']);
            assert.notExists(builder.tree.suites.byId['root replacement']);
            assert.notExists(builder.tree.browsers.byId['root replacement firefox']);
            assert.notExists(builder.tree.results.byId['root replacement firefox 0']);
            assert.exists(builder.tree.suites.byId['root unchanged']);

            builder.removeTestsByFiles([changedFile]);
            assert.notExists(builder.tree.suites.byId['root changed']);
            assert.exists(builder.tree.suites.byId['root unchanged']);
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
