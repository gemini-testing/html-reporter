'use strict';

const _ = require('lodash');
const path = require('path');
const fs = require('fs-extra');
const DataTree = require('lib/merge-reports/data-tree');
const {mkSuiteTree, mkSuite, mkState, mkBrowserResult, mkTestResult} = require('test/utils');
const {SUCCESS, FAIL, ERROR, SKIPPED} = require('lib/constants/test-statuses');

describe('lib/merge-reports/data-tree', () => {
    const sandbox = sinon.sandbox.create();

    const mkDataTree_ = (initialData = {}, destPath = 'default-dest-report/path') => {
        return DataTree.create(initialData, destPath);
    };

    const mkData_ = (data = {}) => {
        return _.defaults(data, {suites: [], skips: []});
    };

    beforeEach(() => {
        sandbox.stub(fs, 'moveAsync');
    });

    afterEach(() => sandbox.restore());

    describe('merge "skips" data', () => {
        it('should add skip info that does not exist in tree', async () => {
            const skipInfo = {suite: 'some-suite', browser: 'yabro'};
            const initialData = mkData_();
            const dataCollection = {'src-report/path': mkData_({skips: [skipInfo]})};

            const {skips} = await mkDataTree_(initialData).mergeWith(dataCollection);

            assert.deepEqual(skips, [skipInfo]);
        });

        it('should add skip info if in tree test is skipped in another browser', async () => {
            const skipInfo1 = {suite: 'some-suite', browser: 'yabro'};
            const skipInfo2 = {suite: 'some-suite', browser: 'foobro'};

            const initialData = mkData_({skips: [skipInfo1]});
            const dataCollection = {'src-report/path': mkData_({skips: [skipInfo2]})};

            const {skips} = await mkDataTree_(initialData).mergeWith(dataCollection);

            assert.deepEqual(skips, [skipInfo1, skipInfo2]);
        });

        it('should not add skip info that exists in tree', async () => {
            const skipInfo1 = {suite: 'some-suite', browser: 'yabro'};
            const skipInfo2 = {suite: 'some-suite', browser: 'yabro'};

            const initialData = mkData_({skips: [skipInfo1]});
            const dataCollection = {'src-report/path': mkData_({skips: [skipInfo2]})};

            const {skips} = await mkDataTree_(initialData).mergeWith(dataCollection);

            assert.deepEqual(skips, [skipInfo1]);
        });
    });

    describe('merge "suites" data', () => {
        it('should add data from non-existent suite in tree', async () => {
            const srcDataSuites1 = mkSuiteTree({suite: mkSuite({suitePath: ['suite1']})});
            const srcDataSuites2 = mkSuiteTree({suite: mkSuite({suitePath: ['suite2']})});

            const initialData = mkData_({suites: [srcDataSuites1]});
            const dataCollection = {'src-report/path': mkData_({suites: [srcDataSuites2]})};

            const {suites} = await mkDataTree_(initialData).mergeWith(dataCollection);

            assert.deepEqual(suites[1], srcDataSuites2);
        });

        it('should add data from non-existent state in tree', async () => {
            const srcDataSuites1 = mkSuiteTree({
                suite: mkSuite({suitePath: ['suite']}),
                state: mkState({suitePath: ['suite', 'state']})
            });
            const srcDataSuites2 = mkSuiteTree({
                suite: mkSuite({suitePath: ['suite']}),
                state: mkState({suitePath: ['suite', 'state2']})
            });

            const initialData = mkData_({suites: [srcDataSuites1]});
            const dataCollection = {'src-report/path': mkData_({suites: [srcDataSuites2]})};

            const {suites} = await mkDataTree_(initialData).mergeWith(dataCollection);

            assert.deepEqual(suites[0].children[1], srcDataSuites2.children[0]);
        });

        it('should add data from non-existent browser in tree', async () => {
            const srcDataSuites1 = mkSuiteTree({
                suite: mkSuite({suitePath: ['suite']}),
                state: mkState({suitePath: ['suite', 'state']}),
                browsers: []
            });
            const srcDataSuites2 = mkSuiteTree({
                suite: mkSuite({suitePath: ['suite']}),
                state: mkState({suitePath: ['suite', 'state']}),
                browsers: [mkBrowserResult(mkTestResult({name: 'yabro'}))]
            });

            const initialData = mkData_({suites: [srcDataSuites1]});
            const dataCollection = {'src-report/path': mkData_({suites: [srcDataSuites2]})};

            const {suites} = await mkDataTree_(initialData).mergeWith(dataCollection);

            assert.deepEqual(suites[0].children[0].browsers[0], srcDataSuites2.children[0].browsers[0]);
        });

        describe('from existent browser with correct modified "attempt" field', () => {
            it('should merge browser results if there are no successful tests', async () => {
                const srcDataSuites1 = mkSuiteTree({
                    browsers: [mkBrowserResult({
                        name: 'yabro',
                        result: mkTestResult({status: ERROR, attempt: 1}),
                        retries: [mkTestResult({status: ERROR, attempt: 0})]
                    })]
                });
                const srcDataSuites2 = mkSuiteTree({
                    browsers: [mkBrowserResult({
                        name: 'yabro',
                        result: mkTestResult({status: FAIL, attempt: 1}),
                        retries: [mkTestResult({status: FAIL, attempt: 0})]
                    })]
                });

                const initialData = mkData_({suites: [srcDataSuites1]});
                const dataCollection = {'src-report/path': mkData_({suites: [srcDataSuites2]})};

                const {suites} = await mkDataTree_(initialData).mergeWith(dataCollection);

                assert.deepEqual(suites[0].children[0].browsers[0], {
                    name: 'yabro',
                    result: mkTestResult({status: FAIL, attempt: 3}),
                    retries: [
                        mkTestResult({status: ERROR, attempt: 0}),
                        mkTestResult({status: ERROR, attempt: 1}),
                        mkTestResult({status: FAIL, attempt: 2})
                    ]
                });
            });

            it('should add failed result even if it is already successed in tree', async () => {
                const srcDataSuites1 = mkSuiteTree({
                    browsers: [mkBrowserResult({
                        name: 'yabro',
                        result: mkTestResult({status: SUCCESS, attempt: 0})
                    })]
                });
                const srcDataSuites2 = mkSuiteTree({
                    browsers: [mkBrowserResult({
                        name: 'yabro',
                        result: mkTestResult({status: FAIL, attempt: 0})
                    })]
                });

                const initialData = mkData_({suites: [srcDataSuites1]});
                const dataCollection = {'src-report/path': mkData_({suites: [srcDataSuites2]})};

                const {suites} = await mkDataTree_(initialData).mergeWith(dataCollection);

                assert.deepEqual(suites[0].children[0].browsers[0], {
                    name: 'yabro',
                    result: mkTestResult({status: FAIL, attempt: 1}),
                    retries: [mkTestResult({status: SUCCESS, attempt: 0})]
                });
            });

            it('should add second success result even if it is already successed in tree', async () => {
                const srcDataSuites1 = mkSuiteTree({
                    browsers: [mkBrowserResult({
                        name: 'yabro',
                        result: mkTestResult({status: SUCCESS, attempt: 0})
                    })]
                });
                const srcDataSuites2 = mkSuiteTree({
                    browsers: [mkBrowserResult({
                        name: 'yabro',
                        result: mkTestResult({status: SUCCESS, attempt: 0})
                    })]
                });

                const initialData = mkData_({suites: [srcDataSuites1]});
                const dataCollection = {'src-report/path': mkData_({suites: [srcDataSuites2]})};

                const {suites} = await mkDataTree_(initialData).mergeWith(dataCollection);

                assert.deepEqual(suites[0].children[0].browsers[0], {
                    name: 'yabro',
                    result: mkTestResult({status: SUCCESS, attempt: 1}),
                    retries: [mkTestResult({status: SUCCESS, attempt: 0})]
                });
            });
        });
    });

    describe('merge statistics data', () => {
        describe('from non-existent suite in tree', () => {
            [
                {statName: 'passed', status: SUCCESS},
                {statName: 'failed', status: FAIL},
                {statName: 'failed', status: ERROR},
                {statName: 'skipped', status: SKIPPED}
            ].forEach(({statName, status}) => {
                it(`should increment "total" and "${statName}" if test result status is "${status}"`, async () => {
                    const srcDataSuites1 = mkSuiteTree({suite: mkSuite({suitePath: ['suite1']})});
                    const srcDataSuites2 = mkSuiteTree({
                        suite: mkSuite({suitePath: ['suite2']}),
                        browsers: [mkBrowserResult({
                            result: mkTestResult({status})
                        })]
                    });

                    const initialData = mkData_({suites: [srcDataSuites1], total: 1, [statName]: 1});
                    const dataCollection = {'src-report/path': mkData_({suites: [srcDataSuites2]})};

                    const result = await mkDataTree_(initialData).mergeWith(dataCollection);

                    assert.equal(result.total, 2);
                    assert.equal(result[statName], 2);
                });

                it('should increment only "retries" if test retry status is "${status}"', async () => {
                    const srcDataSuites1 = mkSuiteTree({suite: mkSuite({suitePath: ['suite1']})});
                    const srcDataSuites2 = mkSuiteTree({
                        suite: mkSuite({suitePath: ['suite2']}),
                        browsers: [mkBrowserResult({
                            retries: [mkTestResult({status})]
                        })]
                    });

                    const initialData = mkData_({suites: [srcDataSuites1], total: 1, [statName]: 1, retries: 0});
                    const dataCollection = {'src-report/path': mkData_({suites: [srcDataSuites2]})};

                    const result = await mkDataTree_(initialData).mergeWith(dataCollection);

                    assert.equal(result.total, 1);
                    assert.equal(result[statName], 1);
                    assert.equal(result.retries, 1);
                });
            });
        });

        describe('from non-existent state in tree', () => {
            [
                {statName: 'passed', status: SUCCESS},
                {statName: 'failed', status: FAIL},
                {statName: 'failed', status: ERROR},
                {statName: 'skipped', status: SKIPPED}
            ].forEach(({statName, status}) => {
                it(`should increment "total" and "${statName}" if test result status is "${status}"`, async () => {
                    const srcDataSuites1 = mkSuiteTree({
                        suite: mkSuite({suitePath: ['suite']}),
                        state: mkState({suitePath: ['suite', 'state']})
                    });
                    const srcDataSuites2 = mkSuiteTree({
                        suite: mkSuite({suitePath: ['suite']}),
                        state: mkState({suitePath: ['suite', 'state2']}),
                        browsers: [mkBrowserResult({
                            result: mkTestResult({status})
                        })]
                    });

                    const initialData = mkData_({suites: [srcDataSuites1], total: 1, [statName]: 1});
                    const dataCollection = {'src-report/path': mkData_({suites: [srcDataSuites2]})};

                    const result = await mkDataTree_(initialData).mergeWith(dataCollection);

                    assert.equal(result.total, 2);
                    assert.equal(result[statName], 2);
                });

                it('should increment only "retries" if test retry status is "${status}"', async () => {
                    const srcDataSuites1 = mkSuiteTree({
                        suite: mkSuite({suitePath: ['suite']}),
                        state: mkState({suitePath: ['suite', 'state']})
                    });
                    const srcDataSuites2 = mkSuiteTree({
                        suite: mkSuite({suitePath: ['suite']}),
                        state: mkState({suitePath: ['suite', 'state2']}),
                        browsers: [mkBrowserResult({
                            retries: [mkTestResult({status})]
                        })]
                    });

                    const initialData = mkData_({suites: [srcDataSuites1], total: 1, [statName]: 1, retries: 0});
                    const dataCollection = {'src-report/path': mkData_({suites: [srcDataSuites2]})};

                    const result = await mkDataTree_(initialData).mergeWith(dataCollection);

                    assert.equal(result.total, 1);
                    assert.equal(result[statName], 1);
                    assert.equal(result.retries, 1);
                });
            });
        });

        describe('from non-existent browser', () => {
            [
                {statName: 'passed', status: SUCCESS},
                {statName: 'failed', status: FAIL},
                {statName: 'failed', status: ERROR},
                {statName: 'skipped', status: SKIPPED}
            ].forEach(({statName, status}) => {
                it(`should increment "total" and "${statName}" if test result status is "${status}"`, async () => {
                    const srcDataSuites1 = mkSuiteTree({
                        suite: mkSuite({suitePath: ['suite']}),
                        state: mkState({suitePath: ['suite', 'state']}),
                        browsers: []
                    });
                    const srcDataSuites2 = mkSuiteTree({
                        suite: mkSuite({suitePath: ['suite']}),
                        state: mkState({suitePath: ['suite', 'state']}),
                        browsers: [mkBrowserResult({
                            result: mkTestResult({status})
                        })]
                    });

                    const initialData = mkData_({suites: [srcDataSuites1], total: 1, [statName]: 1});
                    const dataCollection = {'src-report/path': mkData_({suites: [srcDataSuites2]})};

                    const result = await mkDataTree_(initialData).mergeWith(dataCollection);

                    assert.equal(result.total, 2);
                    assert.equal(result[statName], 2);
                });

                it('should increment only "retries" if test retry status is "${status}"', async () => {
                    const srcDataSuites1 = mkSuiteTree({
                        suite: mkSuite({suitePath: ['suite']}),
                        state: mkState({suitePath: ['suite', 'state']}),
                        browsers: []
                    });
                    const srcDataSuites2 = mkSuiteTree({
                        suite: mkSuite({suitePath: ['suite']}),
                        state: mkState({suitePath: ['suite', 'state']}),
                        browsers: [mkBrowserResult({
                            retries: [mkTestResult({status})]
                        })]
                    });

                    const initialData = mkData_({suites: [srcDataSuites1], total: 1, [statName]: 1, retries: 0});
                    const dataCollection = {'src-report/path': mkData_({suites: [srcDataSuites2]})};

                    const result = await mkDataTree_(initialData).mergeWith(dataCollection);

                    assert.equal(result.total, 1);
                    assert.equal(result[statName], 1);
                    assert.equal(result.retries, 1);
                });
            });
        });

        describe('from existent browser', () => {
            let srcDataSuites1, srcDataSuites2;

            describe('if current result in tree and source report are not successful', () => {
                beforeEach(() => {
                    srcDataSuites1 = mkSuiteTree({
                        browsers: [mkBrowserResult({
                            name: 'yabro',
                            result: mkTestResult({status: SKIPPED})
                        })]
                    });
                    srcDataSuites2 = mkSuiteTree({
                        browsers: [mkBrowserResult({
                            name: 'yabro',
                            result: mkTestResult({status: FAIL}),
                            retries: [mkTestResult({status: FAIL})]
                        })]
                    });
                });

                it('should change current status', async () => {
                    const initialData = mkData_({suites: [srcDataSuites1], total: 1, skipped: 1, failed: 0});
                    const dataCollection = {'src-report/path': mkData_({suites: [srcDataSuites2]})};

                    const result = await mkDataTree_(initialData).mergeWith(dataCollection);

                    assert.equal(result.total, 1);
                    assert.equal(result.skipped, 0);
                    assert.equal(result.failed, 1);
                });

                it('should increment "retries" by current result and retries from source report', async () => {
                    const initialData = mkData_({suites: [srcDataSuites1], total: 1, retries: 0});
                    const dataCollection = {'src-report/path': mkData_({suites: [srcDataSuites2]})};

                    const result = await mkDataTree_(initialData).mergeWith(dataCollection);

                    assert.equal(result.total, 1);
                    assert.equal(result.retries, 2);
                });
            });

            describe('if current result in tree is successful', () => {
                beforeEach(() => {
                    srcDataSuites1 = mkSuiteTree({
                        browsers: [mkBrowserResult({
                            name: 'yabro',
                            result: mkTestResult({status: SUCCESS})
                        })]
                    });
                    srcDataSuites2 = mkSuiteTree({
                        browsers: [mkBrowserResult({
                            name: 'yabro',
                            result: mkTestResult({status: FAIL}),
                            retries: [mkTestResult({status: FAIL})]
                        })]
                    });
                });

                it('should change current status', async () => {
                    const initialData = mkData_({suites: [srcDataSuites1], total: 1, passed: 1, failed: 0});
                    const dataCollection = {'src-report/path': mkData_({suites: [srcDataSuites2]})};

                    const result = await mkDataTree_(initialData).mergeWith(dataCollection);

                    assert.equal(result.total, 1);
                    assert.equal(result.passed, 0);
                    assert.equal(result.failed, 1);
                });

                it('should increment "retries" by current result and retries from source report', async () => {
                    const initialData = mkData_({suites: [srcDataSuites1], total: 1, retries: 0});
                    const dataCollection = {'src-report/path': mkData_({suites: [srcDataSuites2]})};

                    const result = await mkDataTree_(initialData).mergeWith(dataCollection);

                    assert.equal(result.total, 1);
                    assert.equal(result.retries, 2);
                });
            });

            describe('if current result in tree and source report are successful', () => {
                it('should increment "retries" by current result from source report', async () => {
                    const srcDataSuites1 = mkSuiteTree({
                        browsers: [mkBrowserResult({
                            name: 'yabro',
                            result: mkTestResult({status: SUCCESS})
                        })]
                    });
                    const srcDataSuites2 = mkSuiteTree({
                        browsers: [mkBrowserResult({
                            name: 'yabro',
                            result: mkTestResult({status: SUCCESS})
                        })]
                    });

                    const initialData = mkData_({suites: [srcDataSuites1], total: 1, passed: 1, retries: 0});
                    const dataCollection = {'src-report/path': mkData_({suites: [srcDataSuites2]})};

                    const result = await mkDataTree_(initialData).mergeWith(dataCollection);

                    assert.equal(result.total, 1);
                    assert.equal(result.passed, 1);
                    assert.equal(result.retries, 1);
                });
            });
        });
    });

    describe('move images', () => {
        it('should not move image specified in "refImg"', async () => {
            const srcDataSuites1 = mkSuiteTree();
            const srcDataSuites2 = mkSuiteTree({
                browsers: [mkBrowserResult({
                    name: 'yabro',
                    result: mkTestResult({imagesInfo: [{refImage: {path: 'screens/yabro/stateName.png'}}]})
                })]
            });

            const initialData = mkData_({suites: [srcDataSuites1]});
            const dataCollection = {'src-report/path': mkData_({suites: [srcDataSuites2]})};

            await mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection);

            assert.neverCalledWith(
                fs.moveAsync,
                path.resolve('src-report/path', 'screens/yabro/stateName.png'),
                path.resolve('dest-report/path', 'screens/yabro/stateName.png'),
            );
        });

        [
            {keyName: 'actualImg', imgPaths: ['images/yabro~current_0.png', 'images/yabro~current_1.png']},
            {keyName: 'expectedImg', imgPaths: ['images/yabro~ref_0.png', 'images/yabro~ref_1.png']},
            {keyName: 'diffImg', imgPaths: ['images/yabro~diff_0.png', 'images/yabro~diff_1.png']}
        ].forEach(({keyName, imgPaths}) => {
            it(`should move image specified in "${keyName}" field`, async () => {
                const srcDataSuites1 = mkSuiteTree();
                const srcDataSuites2 = mkSuiteTree({
                    browsers: [mkBrowserResult({
                        name: 'yabro',
                        result: mkTestResult({imagesInfo: [{[keyName]: {path: imgPaths[1]}}]}),
                        retries: [mkTestResult({imagesInfo: [{[keyName]: {path: imgPaths[0]}}]})]
                    })]
                });

                const initialData = mkData_({suites: [srcDataSuites1]});
                const dataCollection = {'src-report/path': mkData_({suites: [srcDataSuites2]})};

                await mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection);

                imgPaths.forEach((imgPath) => {
                    assert.calledWith(
                        fs.moveAsync,
                        path.resolve('src-report/path', imgPath),
                        path.resolve('dest-report/path', imgPath)
                    );
                });
            });
        });

        it('should move images from non-existent suite in tree', async () => {
            const srcDataSuites1 = mkSuiteTree({suite: mkSuite({suitePath: ['suite1']})});
            const srcDataSuites2 = mkSuiteTree({
                suite: mkSuite({suitePath: ['suite2']}),
                state: mkState({suitePath: ['suite2', 'state']}),
                browsers: [mkBrowserResult({
                    name: 'yabro',
                    result: mkTestResult({imagesInfo: [{actualImg: {path: 'images/yabro~current_1.png'}}]}),
                    retries: [mkTestResult({imagesInfo: [{actualImg: {path: 'images/yabro~current_0.png'}}]})]
                })]
            });

            const initialData = mkData_({suites: [srcDataSuites1]});
            const dataCollection = {'src-report/path': mkData_({suites: [srcDataSuites2]})};

            await mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection);

            [0, 1].forEach((attempt) => {
                assert.calledWith(
                    fs.moveAsync,
                    path.resolve('src-report/path', `images/yabro~current_${attempt}.png`),
                    path.resolve('dest-report/path', `images/yabro~current_${attempt}.png`)
                );
            });
        });

        it('should move images from non-existent state', async () => {
            const srcDataSuites1 = mkSuiteTree({
                suite: mkSuite({suitePath: ['suite']}),
                state: mkState({suitePath: ['suite', 'state']})
            });
            const srcDataSuites2 = mkSuiteTree({
                suite: mkSuite({suitePath: ['suite']}),
                state: mkState({suitePath: ['suite', 'state2']}),
                browsers: [mkBrowserResult({
                    name: 'yabro',
                    result: mkTestResult({imagesInfo: [{actualImg: {path: 'images/yabro~current_1.png'}}]}),
                    retries: [mkTestResult({imagesInfo: [{actualImg: {path: 'images/yabro~current_0.png'}}]})]
                })]
            });

            const initialData = mkData_({suites: [srcDataSuites1]});
            const dataCollection = {'src-report/path': mkData_({suites: [srcDataSuites2]})};

            await mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection);

            [0, 1].forEach((attempt) => {
                assert.calledWith(
                    fs.moveAsync,
                    path.resolve('src-report/path', `images/yabro~current_${attempt}.png`),
                    path.resolve('dest-report/path', `images/yabro~current_${attempt}.png`)
                );
            });
        });

        it('should move images from non-existent browser', async () => {
            const srcDataSuites1 = mkSuiteTree({
                suite: mkSuite({suitePath: ['suite']}),
                state: mkState({suitePath: ['suite', 'state']}),
                browsers: []
            });
            const srcDataSuites2 = mkSuiteTree({
                suite: mkSuite({suitePath: ['suite']}),
                state: mkState({suitePath: ['suite', 'state']}),
                browsers: [mkBrowserResult({
                    name: 'yabro',
                    result: mkTestResult({imagesInfo: [{actualImg: {path: 'images/yabro~current_1.png'}}]}),
                    retries: [mkTestResult({imagesInfo: [{actualImg: {path: 'images/yabro~current_0.png'}}]})]
                })]
            });

            const initialData = mkData_({suites: [srcDataSuites1]});
            const dataCollection = {'src-report/path': mkData_({suites: [srcDataSuites2]})};

            await mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection);

            [0, 1].forEach((attempt) => {
                assert.calledWith(
                    fs.moveAsync,
                    path.resolve('src-report/path', `images/yabro~current_${attempt}.png`),
                    path.resolve('dest-report/path', `images/yabro~current_${attempt}.png`)
                );
            });
        });

        describe('from existent browser tree with modified attempt value in images', () => {
            it('should move images of success result if it is already successed in first report', async () => {
                const srcDataSuites1 = mkSuiteTree({
                    browsers: [mkBrowserResult({
                        name: 'yabro',
                        result: mkTestResult({status: SUCCESS})
                    })]
                });
                const srcDataSuites2 = mkSuiteTree({
                    browsers: [mkBrowserResult({
                        name: 'yabro',
                        result: mkTestResult({
                            status: SUCCESS,
                            imagesInfo: [{actualImg: {path: 'images/yabro~current_0.png'}}]
                        })
                    })]
                });

                const initialData = mkData_({suites: [srcDataSuites1]});
                const dataCollection = {'src-report/path': mkData_({suites: [srcDataSuites2]})};

                await mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection);

                assert.calledOnceWith(
                    fs.moveAsync,
                    path.resolve('src-report/path', 'images/yabro~current_0.png'),
                    path.resolve('dest-report/path', 'images/yabro~current_1.png')
                );
            });

            it('should move images if there are no successful tests', async () => {
                const srcDataSuites1 = mkSuiteTree({
                    browsers: [mkBrowserResult({
                        name: 'yabro',
                        result: mkTestResult()
                    })]
                });
                const srcDataSuites2 = mkSuiteTree({
                    browsers: [mkBrowserResult({
                        name: 'yabro',
                        result: mkTestResult({imagesInfo: [{actualImg: {path: 'images/yabro~current_0.png'}}]})
                    })]
                });

                const initialData = mkData_({suites: [srcDataSuites1]});
                const dataCollection = {'src-report/path': mkData_({suites: [srcDataSuites2]})};

                await mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection);

                assert.calledWith(
                    fs.moveAsync,
                    path.resolve('src-report/path', `images/yabro~current_0.png`),
                    path.resolve('dest-report/path', `images/yabro~current_1.png`)
                );
            });

            it('should move images if there are no successful tests with retries', async () => {
                const srcDataSuites1 = mkSuiteTree({
                    browsers: [mkBrowserResult({
                        name: 'yabro',
                        result: mkTestResult()
                    })]
                });
                const srcDataSuites2 = mkSuiteTree({
                    browsers: [mkBrowserResult({
                        name: 'yabro',
                        result: mkTestResult({imagesInfo: [{actualImg: {path: 'images/yabro~current_1.png'}}]}),
                        retries: [mkTestResult({imagesInfo: [{actualImg: {path: 'images/yabro~current_0.png'}}]})]
                    })]
                });

                const initialData = mkData_({suites: [srcDataSuites1]});
                const dataCollection = {'src-report/path': mkData_({suites: [srcDataSuites2]})};

                await mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection);

                [0, 1].forEach((attempt) => {
                    assert.calledWith(
                        fs.moveAsync,
                        path.resolve('src-report/path', `images/yabro~current_${attempt}.png`),
                        path.resolve('dest-report/path', `images/yabro~current_${attempt + 1}.png`)
                    );
                });
            });

            it('should move images if there is successful test in first report', async () => {
                const srcDataSuites1 = mkSuiteTree({
                    browsers: [mkBrowserResult({
                        name: 'yabro',
                        result: mkTestResult({
                            status: SUCCESS,
                            imagesInfo: [{actualImg: {path: 'images/yabro~current_0.png'}}]
                        })
                    })]
                });
                const srcDataSuites2 = mkSuiteTree({
                    browsers: [mkBrowserResult({
                        name: 'yabro',
                        result: mkTestResult({imagesInfo: [{actualImg: {path: 'images/yabro~current_0.png'}}]})
                    })]
                });

                const initialData = mkData_({suites: [srcDataSuites1]});
                const dataCollection = {'src-report/path': mkData_({suites: [srcDataSuites2]})};

                await mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection);

                assert.calledWith(
                    fs.moveAsync,
                    path.resolve('src-report/path', `images/yabro~current_0.png`),
                    path.resolve('dest-report/path', `images/yabro~current_1.png`)
                );
            });

            it('should move images if there is successful test in first report with retries', async () => {
                const srcDataSuites1 = mkSuiteTree({
                    browsers: [mkBrowserResult({
                        name: 'yabro',
                        result: mkTestResult({status: SUCCESS, imagesInfo: [{actualImg: {path: 'images/yabro~current_1.png'}}]}),
                        retries: [mkTestResult()]
                    })]
                });
                const srcDataSuites2 = mkSuiteTree({
                    browsers: [mkBrowserResult({
                        name: 'yabro',
                        result: mkTestResult({imagesInfo: [{actualImg: {path: 'images/yabro~current_1.png'}}]}),
                        retries: [mkTestResult({imagesInfo: [{actualImg: {path: 'images/yabro~current_0.png'}}]})]
                    })]
                });

                const initialData = mkData_({suites: [srcDataSuites1]});
                const dataCollection = {'src-report/path': mkData_({suites: [srcDataSuites2]})};

                await mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection);

                [0, 1].forEach((attempt) => {
                    assert.calledWith(
                        fs.moveAsync,
                        path.resolve('src-report/path', `images/yabro~current_${attempt}.png`),
                        path.resolve('dest-report/path', `images/yabro~current_${attempt + 2}.png`)
                    );
                });
            });

            it('should move images if there is successful test in source report', async () => {
                const srcDataSuites1 = mkSuiteTree({
                    browsers: [mkBrowserResult({
                        name: 'yabro',
                        result: mkTestResult()
                    })]
                });
                const srcDataSuites2 = mkSuiteTree({
                    browsers: [mkBrowserResult({
                        name: 'yabro',
                        result: mkTestResult({
                            status: SUCCESS,
                            imagesInfo: [{actualImg: {path: 'images/yabro~current_0.png'}}]
                        })
                    })]
                });

                const initialData = mkData_({suites: [srcDataSuites1]});
                const dataCollection = {'src-report/path': mkData_({suites: [srcDataSuites2]})};

                await mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection);

                assert.calledWith(
                    fs.moveAsync,
                    path.resolve('src-report/path', 'images/yabro~current_0.png'),
                    path.resolve('dest-report/path', 'images/yabro~current_1.png')
                );
            });
        });

        it('should change suite status if current result in tree is not successful', async () => {
            const srcDataSuites1 = mkSuiteTree({
                suite: mkSuite({status: FAIL}),
                state: mkState({status: FAIL}),
                browsers: [mkBrowserResult({
                    name: 'yabro',
                    result: mkTestResult({status: FAIL, attempt: 0})
                })]
            });
            const srcDataSuites2 = mkSuiteTree({
                browsers: [mkBrowserResult({
                    name: 'yabro',
                    result: mkTestResult({status: SUCCESS, attempt: 0})
                })]
            });

            const initialData = mkData_({suites: [srcDataSuites1]});
            const dataCollection = {'src-report/path': mkData_({suites: [srcDataSuites2]})};

            const {suites} = await mkDataTree_(initialData).mergeWith(dataCollection);

            assert.equal(suites[0].status, SUCCESS);
            assert.equal(suites[0].children[0].status, SUCCESS);
        });

        it('should not change suite status if current result in source report is skipped', async () => {
            const srcDataSuites1 = mkSuiteTree({
                suite: mkSuite({status: SUCCESS}),
                state: mkState({status: SUCCESS}),
                browsers: [mkBrowserResult({
                    name: 'yabro',
                    result: mkTestResult({status: SUCCESS, attempt: 0})
                })]
            });
            const srcDataSuites2 = mkSuiteTree({
                browsers: [mkBrowserResult({
                    name: 'yabro',
                    result: mkTestResult({status: SKIPPED, attempt: 0})
                })]
            });

            const initialData = mkData_({suites: [srcDataSuites1]});
            const dataCollection = {'src-report/path': mkData_({suites: [srcDataSuites2]})};

            const {suites} = await mkDataTree_(initialData).mergeWith(dataCollection);

            assert.equal(suites[0].status, SUCCESS);
            assert.equal(suites[0].children[0].status, SUCCESS);
        });
    });
});
