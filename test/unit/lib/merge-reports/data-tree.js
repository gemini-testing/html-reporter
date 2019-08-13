'use strict';

const path = require('path');

const fs = require('fs-extra');

const DataTree = require('lib/merge-reports/data-tree');
const {mkSuiteTree, mkSuite, mkState, mkBrowserResult, mkTestResult} = require('test/unit/utils');
const {SUCCESS, FAIL, ERROR, SKIPPED} = require('lib/constants/test-statuses');
const {logger} = require('lib/server-utils');

describe('lib/merge-reports/data-tree', () => {
    const sandbox = sinon.sandbox.create();

    const mkDataTree_ = (initialData = {}, destPath = 'default-dest-report/path') => {
        return DataTree.create(initialData, destPath);
    };

    beforeEach(() => {
        sandbox.stub(fs, 'move');
        sandbox.stub(logger, 'error');
    });

    afterEach(() => sandbox.restore());

    describe('merge "skips" data', () => {
        it('should add skip info that does not exist in tree', async () => {
            const skipInfo = {suite: 'some-suite', browser: 'yabro'};
            const initialData = {};
            const dataCollection = {'src-report/path': {skips: [skipInfo]}};

            const {skips} = await mkDataTree_(initialData).mergeWith(dataCollection);

            assert.deepEqual(skips, [skipInfo]);
        });

        it('should add skip info if in tree test is skipped in another browser', async () => {
            const skipInfo1 = {suite: 'some-suite', browser: 'yabro'};
            const skipInfo2 = {suite: 'some-suite', browser: 'foobro'};

            const initialData = {skips: [skipInfo1]};
            const dataCollection = {'src-report/path': {skips: [skipInfo2]}};

            const {skips} = await mkDataTree_(initialData).mergeWith(dataCollection);

            assert.deepEqual(skips, [skipInfo1, skipInfo2]);
        });

        it('should not add skip info that exists in tree', async () => {
            const skipInfo1 = {suite: 'some-suite', browser: 'yabro'};
            const skipInfo2 = {suite: 'some-suite', browser: 'yabro'};

            const initialData = {skips: [skipInfo1]};
            const dataCollection = {'src-report/path': {skips: [skipInfo2]}};

            const {skips} = await mkDataTree_(initialData).mergeWith(dataCollection);

            assert.deepEqual(skips, [skipInfo1]);
        });
    });

    describe('merge "suites" data', () => {
        it('should add data from non-existent suite in tree', async () => {
            const srcDataSuites1 = mkSuiteTree({suite: mkSuite({suitePath: ['suite1']})});
            const srcDataSuites2 = mkSuiteTree({suite: mkSuite({suitePath: ['suite2']})});

            const initialData = {suites: [srcDataSuites1]};
            const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

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

            const initialData = {suites: [srcDataSuites1]};
            const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

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

            const initialData = {suites: [srcDataSuites1]};
            const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

            const {suites} = await mkDataTree_(initialData).mergeWith(dataCollection);

            assert.deepEqual(suites[0].children[0].browsers[0], srcDataSuites2.children[0].browsers[0]);
        });

        it('should add data to state from suite with the same name', async () => {
            const srcDataSuites1 = mkSuite({
                suitePath: ['suite'],
                children: [mkState({
                    suitePath: ['suite', 'state'],
                    browsers: [mkBrowserResult()]
                })]
            });
            const srcDataSuites2 = mkSuite({
                suitePath: ['suite'],
                children: [mkSuite({
                    suitePath: ['suite', 'state'],
                    children: [mkState({
                        suitePath: ['suite', 'state', 'state'],
                        browsers: [mkBrowserResult()]
                    })]
                })]
            });
            const expected = mkSuite({
                suitePath: ['suite'],
                children: [mkState({
                    suitePath: ['suite', 'state'],
                    browsers: [mkBrowserResult()],
                    children: [mkState({
                        suitePath: ['suite', 'state', 'state'],
                        browsers: [mkBrowserResult()]
                    })]
                })]
            });

            const initialData = {suites: [srcDataSuites1]};
            const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};
            const {suites} = await mkDataTree_(initialData).mergeWith(dataCollection);

            assert.deepEqual(suites[0], expected);
        });

        it('should add data to suite from state with the same name', async () => {
            const srcDataSuites1 = mkSuite({
                suitePath: ['suite'],
                children: [mkSuite({
                    suitePath: ['suite', 'state'],
                    children: [mkState({
                        suitePath: ['suite', 'state', 'state'],
                        browsers: [mkBrowserResult()]
                    })]
                })]
            });
            const srcDataSuites2 = mkSuite({
                suitePath: ['suite'],
                children: [mkState({
                    suitePath: ['suite', 'state'],
                    browsers: [mkBrowserResult()]
                })]
            });
            const expected = mkSuite({
                suitePath: ['suite'],
                children: [mkState({
                    suitePath: ['suite', 'state'],
                    browsers: [mkBrowserResult()],
                    children: [mkState({
                        suitePath: ['suite', 'state', 'state'],
                        browsers: [mkBrowserResult()]
                    })]
                })]
            });

            const initialData = {suites: [srcDataSuites1]};
            const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};
            const {suites} = await mkDataTree_(initialData).mergeWith(dataCollection);

            assert.deepEqual(suites[0], expected);
        });

        it('should set status from non-existent suite in tree', async () => {
            const srcDataSuites1 = mkSuite({
                suitePath: ['suite'],
                children: [
                    mkState({
                        suitePath: ['suite', 'state1'],
                        browsers: [mkBrowserResult()]
                    })
                ]
            });
            const srcDataSuites2 = mkSuite({
                suitePath: ['suite'],
                children: [
                    mkState({
                        suitePath: ['suite', 'state2'],
                        browsers: [mkBrowserResult()],
                        status: 'error'
                    })
                ]
            });
            const expected = mkSuite({
                suitePath: ['suite'],
                children: [
                    mkState({
                        suitePath: ['suite', 'state1'],
                        browsers: [mkBrowserResult()]
                    }),
                    mkState({
                        suitePath: ['suite', 'state2'],
                        browsers: [mkBrowserResult()],
                        status: 'error'
                    })
                ],
                status: 'error'
            });

            const initialData = {suites: [srcDataSuites1]};
            const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};
            const {suites} = await mkDataTree_(initialData).mergeWith(dataCollection);

            assert.deepEqual(suites[0], expected);
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

                const initialData = {suites: [srcDataSuites1]};
                const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

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

            it('should add failed result even if it is already succeed in tree', async () => {
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

                const initialData = {suites: [srcDataSuites1]};
                const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

                const {suites} = await mkDataTree_(initialData).mergeWith(dataCollection);

                assert.deepEqual(suites[0].children[0].browsers[0], {
                    name: 'yabro',
                    result: mkTestResult({status: FAIL, attempt: 1}),
                    retries: [mkTestResult({status: SUCCESS, attempt: 0})]
                });
            });

            it('should add second success result even if it is already succeed in tree', async () => {
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

                const initialData = {suites: [srcDataSuites1]};
                const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

                const {suites} = await mkDataTree_(initialData).mergeWith(dataCollection);

                assert.deepEqual(suites[0].children[0].browsers[0], {
                    name: 'yabro',
                    result: mkTestResult({status: SUCCESS, attempt: 1}),
                    retries: [mkTestResult({status: SUCCESS, attempt: 0})]
                });
            });
        });

        describe('with children and browsers', () => {
            it('should add data to suite from children with error status', async () => {
                const srcDataSuites1 = mkSuite({
                    suitePath: ['first suite'],
                    status: SUCCESS,
                    children: [
                        mkSuite({
                            suitePath: ['first suite', 'second suite'],
                            status: SUCCESS,
                            browsers: [mkBrowserResult({
                                result: mkTestResult({status: SUCCESS}),
                                name: 'first-bro'
                            })]
                        })
                    ]
                });
                const srcDataSuites2 = mkSuite({
                    suitePath: ['first suite'],
                    status: ERROR,
                    children: [
                        mkSuite({
                            suitePath: ['first suite', 'second suite'],
                            status: ERROR,
                            children: [
                                mkState({
                                    suitePath: ['first suite', 'second suite', 'third suite'],
                                    status: ERROR,
                                    browsers: [mkBrowserResult({
                                        name: 'second-bro',
                                        result: mkTestResult({status: ERROR})
                                    })]
                                })
                            ]
                        })
                    ]
                });

                const initialData = {suites: [srcDataSuites1]};
                const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

                const {suites} = await mkDataTree_(initialData).mergeWith(dataCollection);

                assert.deepEqual(suites[0], mkSuite({
                    suitePath: ['first suite'],
                    status: ERROR,
                    children: [
                        mkSuite({
                            suitePath: ['first suite', 'second suite'],
                            status: ERROR,
                            browsers: [mkBrowserResult({
                                name: 'first-bro',
                                result: mkTestResult({status: SUCCESS})
                            })],
                            children: [
                                mkState({
                                    suitePath: ['first suite', 'second suite', 'third suite'],
                                    status: ERROR,
                                    browsers: [mkBrowserResult({
                                        name: 'second-bro',
                                        result: mkTestResult({status: ERROR})
                                    })]
                                })
                            ]
                        })
                    ]
                }));
            });

            it('should add data to suite from browsers with error status', async () => {
                const srcDataSuites1 = mkSuite({
                    suitePath: ['first suite'],
                    status: SUCCESS,
                    children: [
                        mkSuite({
                            suitePath: ['first suite', 'second suite'],
                            status: SUCCESS,
                            children: [
                                mkState({
                                    suitePath: ['first suite', 'second suite', 'third suite'],
                                    status: SUCCESS,
                                    browsers: [mkBrowserResult({
                                        name: 'first-bro',
                                        result: mkTestResult({status: SUCCESS})
                                    })]
                                })
                            ]
                        })
                    ]
                });
                const srcDataSuites2 = mkSuite({
                    suitePath: ['first suite'],
                    status: ERROR,
                    children: [
                        mkSuite({
                            suitePath: ['first suite', 'second suite'],
                            status: ERROR,
                            browsers: [mkBrowserResult({
                                name: 'second-bro',
                                result: mkTestResult({status: ERROR})
                            })]
                        })
                    ]
                });

                const initialData = {suites: [srcDataSuites1]};
                const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

                const {suites} = await mkDataTree_(initialData).mergeWith(dataCollection);

                assert.deepEqual(suites[0], mkSuite({
                    suitePath: ['first suite'],
                    status: ERROR,
                    children: [
                        mkSuite({
                            suitePath: ['first suite', 'second suite'],
                            status: ERROR,
                            children: [
                                mkState({
                                    suitePath: ['first suite', 'second suite', 'third suite'],
                                    status: SUCCESS,
                                    browsers: [mkBrowserResult({
                                        name: 'first-bro',
                                        result: mkTestResult({status: SUCCESS})
                                    })]
                                })
                            ],
                            browsers: [mkBrowserResult({
                                name: 'second-bro',
                                result: mkTestResult({status: ERROR})
                            })]
                        })
                    ]
                }));
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

                    const initialData = {suites: [srcDataSuites1], total: 1, [statName]: 1};
                    const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

                    const result = await mkDataTree_(initialData).mergeWith(dataCollection);

                    assert.equal(result.total, 2);
                    assert.equal(result[statName], 2);
                });

                it(`should increment only "retries" if test retry status is "${status}"`, async () => {
                    const srcDataSuites1 = mkSuiteTree({suite: mkSuite({suitePath: ['suite1']})});
                    const srcDataSuites2 = mkSuiteTree({
                        suite: mkSuite({suitePath: ['suite2']}),
                        browsers: [mkBrowserResult({
                            retries: [mkTestResult({status})]
                        })]
                    });

                    const initialData = {suites: [srcDataSuites1], total: 1, [statName]: 1, retries: 0};
                    const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

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

                    const initialData = {suites: [srcDataSuites1], total: 1, [statName]: 1};
                    const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

                    const result = await mkDataTree_(initialData).mergeWith(dataCollection);

                    assert.equal(result.total, 2);
                    assert.equal(result[statName], 2);
                });

                it(`should increment only "retries" if test retry status is "${status}"`, async () => {
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

                    const initialData = {suites: [srcDataSuites1], total: 1, [statName]: 1, retries: 0};
                    const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

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

                    const initialData = {suites: [srcDataSuites1], total: 1, [statName]: 1};
                    const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

                    const result = await mkDataTree_(initialData).mergeWith(dataCollection);

                    assert.equal(result.total, 2);
                    assert.equal(result[statName], 2);
                });

                it(`should increment only "retries" if test retry status is "${status}"`, async () => {
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

                    const initialData = {suites: [srcDataSuites1], total: 1, [statName]: 1, retries: 0};
                    const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

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
                    const initialData = {suites: [srcDataSuites1], total: 1, skipped: 1, failed: 0};
                    const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

                    const result = await mkDataTree_(initialData).mergeWith(dataCollection);

                    assert.equal(result.total, 1);
                    assert.equal(result.skipped, 0);
                    assert.equal(result.failed, 1);
                });

                it('should increment "retries" by current result and retries from source report', async () => {
                    const initialData = {suites: [srcDataSuites1], total: 1, retries: 0};
                    const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

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
                    const initialData = {suites: [srcDataSuites1], total: 1, passed: 1, failed: 0};
                    const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

                    const result = await mkDataTree_(initialData).mergeWith(dataCollection);

                    assert.equal(result.total, 1);
                    assert.equal(result.passed, 0);
                    assert.equal(result.failed, 1);
                });

                it('should increment "retries" by current result and retries from source report', async () => {
                    const initialData = {suites: [srcDataSuites1], total: 1, retries: 0};
                    const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

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

                    const initialData = {suites: [srcDataSuites1], total: 1, passed: 1, retries: 0};
                    const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

                    const result = await mkDataTree_(initialData).mergeWith(dataCollection);

                    assert.equal(result.total, 1);
                    assert.equal(result.passed, 1);
                    assert.equal(result.retries, 1);
                });
            });
        });

        describe('with children and browsers', () => {
            it('should add data to suite from children with error status', async () => {
                const srcDataSuites1 = mkSuite({
                    suitePath: ['first suite'],
                    status: SUCCESS
                });
                const srcDataSuites2 = mkSuite({
                    suitePath: ['first suite'],
                    status: ERROR,
                    children: [
                        mkState({
                            suitePath: ['first suite', 'second suite'],
                            status: ERROR,
                            browsers: [mkBrowserResult({
                                name: 'second-bro',
                                result: mkTestResult({status: ERROR})
                            })],
                            children: [
                                mkState({
                                    suitePath: ['first suite', 'second suite', 'third suite'],
                                    status: ERROR,
                                    browsers: [mkBrowserResult({
                                        name: 'second-bro',
                                        result: mkTestResult({status: ERROR})
                                    })]
                                })
                            ]
                        })
                    ]
                });

                const initialData = {suites: [srcDataSuites1], total: 0, passed: 0, failed: 0, skipped: 0};
                const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

                const result = await mkDataTree_(initialData).mergeWith(dataCollection);

                assert.equal(result.total, 2);
                assert.equal(result.failed, 2);
                assert.equal(result.passed, 0);
                assert.equal(result.skipped, 0);
            });

            it('should add data to suite from browsers with error status', async () => {
                const srcDataSuites1 = mkSuite({
                    suitePath: ['first suite'],
                    status: SUCCESS,
                    children: [
                        mkSuite({
                            suitePath: ['first suite', 'second suite'],
                            status: SUCCESS,
                            children: [
                                mkState({
                                    suitePath: ['first suite', 'second suite', 'third suite'],
                                    status: SUCCESS,
                                    browsers: [mkBrowserResult({
                                        name: 'first-bro',
                                        result: mkTestResult({status: SUCCESS})
                                    })]
                                })
                            ]
                        })
                    ]
                });
                const srcDataSuites2 = mkSuite({
                    suitePath: ['first suite'],
                    status: ERROR,
                    children: [
                        mkSuite({
                            suitePath: ['first suite', 'second suite'],
                            status: ERROR,
                            browsers: [mkBrowserResult({
                                name: 'second-bro',
                                result: mkTestResult({status: ERROR})
                            })]
                        })
                    ]
                });

                const initialData = {suites: [srcDataSuites1]};
                const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

                const {suites} = await mkDataTree_(initialData).mergeWith(dataCollection);

                assert.deepEqual(suites[0], mkSuite({
                    suitePath: ['first suite'],
                    status: ERROR,
                    children: [
                        mkSuite({
                            suitePath: ['first suite', 'second suite'],
                            status: ERROR,
                            children: [
                                mkState({
                                    suitePath: ['first suite', 'second suite', 'third suite'],
                                    status: SUCCESS,
                                    browsers: [mkBrowserResult({
                                        name: 'first-bro',
                                        result: mkTestResult({status: SUCCESS})
                                    })]
                                })
                            ],
                            browsers: [mkBrowserResult({
                                name: 'second-bro',
                                result: mkTestResult({status: ERROR})
                            })]
                        })
                    ]
                }));
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

            const initialData = {suites: [srcDataSuites1]};
            const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

            await mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection);

            assert.neverCalledWith(
                fs.move,
                path.resolve('src-report/path', 'screens/yabro/stateName.png'),
                path.resolve('dest-report/path', 'screens/yabro/stateName.png'),
            );
        });

        it('should not move image specified as http url', async () => {
            const srcDataSuites1 = mkSuiteTree();
            const srcDataSuites2 = mkSuiteTree({
                browsers: [mkBrowserResult({
                    name: 'yabro',
                    result: mkTestResult({imagesInfo: [{
                        actualImg: {path: 'http://host.com/screens/yabro/actual.png'},
                        expectedImg: {path: 'http://host.com/screens/yabro/expected.png'},
                        diffImg: {path: 'http://host.com/screens/yabro/diff.png'}
                    }]})
                })]
            });

            const initialData = {suites: [srcDataSuites1]};
            const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

            await mkDataTree_(initialData).mergeWith(dataCollection);

            assert.notCalled(fs.move);
        });

        it('should not move image specified as https url', async () => {
            const srcDataSuites1 = mkSuiteTree();
            const srcDataSuites2 = mkSuiteTree({
                browsers: [mkBrowserResult({
                    name: 'yabro',
                    result: mkTestResult({imagesInfo: [{
                        actualImg: {path: 'https://host.com/screens/yabro/actual.png'},
                        expectedImg: {path: 'https://host.com/screens/yabro/expected.png'},
                        diffImg: {path: 'https://host.com/screens/yabro/diff.png'}
                    }]})
                })]
            });

            const initialData = {suites: [srcDataSuites1]};
            const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

            await mkDataTree_(initialData).mergeWith(dataCollection);

            assert.notCalled(fs.move);
        });

        it('should not crash if image does not exist', async () => {
            const srcDataSuites1 = mkSuiteTree();
            const srcDataSuites2 = mkSuiteTree({
                browsers: [mkBrowserResult({
                    name: 'yabro',
                    result: mkTestResult({imagesInfo: [{
                        actualImg: {path: '/nonexistent/screen.png'}
                    }]})
                })]
            });

            const initialData = {suites: [srcDataSuites1]};
            const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

            const error = new Error('No such file or directory');
            fs.move.rejects(error);

            await assert.isFulfilled(mkDataTree_(initialData).mergeWith(dataCollection));
        });

        it('should print message with error if image does not exist', async () => {
            const srcDataSuites1 = mkSuiteTree();
            const srcDataSuites2 = mkSuiteTree({
                browsers: [mkBrowserResult({
                    name: 'yabro',
                    result: mkTestResult({imagesInfo: [{
                        actualImg: {path: '/nonexistent/screen.png'}
                    }]})
                })]
            });

            const initialData = {suites: [srcDataSuites1]};
            const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

            const error = new Error('No such file or directory');
            fs.move.rejects(error);

            await mkDataTree_(initialData).mergeWith(dataCollection);

            assert.calledOnceWith(logger.error, sinon.match.any, error);
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

                const initialData = {suites: [srcDataSuites1]};
                const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

                await mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection);

                imgPaths.forEach((imgPath) => {
                    assert.calledWith(
                        fs.move,
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

            const initialData = {suites: [srcDataSuites1]};
            const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

            await mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection);

            [0, 1].forEach((attempt) => {
                assert.calledWith(
                    fs.move,
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

            const initialData = {suites: [srcDataSuites1]};
            const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

            await mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection);

            [0, 1].forEach((attempt) => {
                assert.calledWith(
                    fs.move,
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

            const initialData = {suites: [srcDataSuites1]};
            const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

            await mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection);

            [0, 1].forEach((attempt) => {
                assert.calledWith(
                    fs.move,
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

                const initialData = {suites: [srcDataSuites1]};
                const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

                await mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection);

                assert.calledOnceWith(
                    fs.move,
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

                const initialData = {suites: [srcDataSuites1]};
                const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

                await mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection);

                assert.calledWith(
                    fs.move,
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

                const initialData = {suites: [srcDataSuites1]};
                const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

                await mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection);

                [0, 1].forEach((attempt) => {
                    assert.calledWith(
                        fs.move,
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

                const initialData = {suites: [srcDataSuites1]};
                const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

                await mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection);

                assert.calledWith(
                    fs.move,
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

                const initialData = {suites: [srcDataSuites1]};
                const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

                await mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection);

                [0, 1].forEach((attempt) => {
                    assert.calledWith(
                        fs.move,
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

                const initialData = {suites: [srcDataSuites1]};
                const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

                await mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection);

                assert.calledWith(
                    fs.move,
                    path.resolve('src-report/path', 'images/yabro~current_0.png'),
                    path.resolve('dest-report/path', 'images/yabro~current_1.png')
                );
            });
        });

        [
            {status: ERROR},
            {status: FAIL},
            {status: SUCCESS},
            {status: SKIPPED}
        ].forEach(({status}) => {
            it(`should set suite status to ${status}`, async () => {
                const srcDataSuites1 = mkSuiteTree({
                    suite: mkSuite({status}),
                    state: mkState({suitePath: ['default-suite', 'state1'], status}),
                    browsers: [mkBrowserResult({
                        name: 'yabro',
                        result: mkTestResult({status, attempt: 0})
                    })]
                });
                const srcDataSuites2 = mkSuiteTree({
                    suite: mkSuite({status}),
                    state: mkState({suitePath: ['default-suite', 'state2'], status}),
                    browsers: [mkBrowserResult({
                        name: 'yabro',
                        result: mkTestResult({status, attempt: 0})
                    })]
                });

                const initialData = {suites: [srcDataSuites1]};
                const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

                const {suites} = await mkDataTree_(initialData).mergeWith(dataCollection);

                assert.equal(suites[0].children[0].status, status);
                assert.equal(suites[0].children[1].status, status);
                assert.equal(suites[0].status, status);
            });
        });

        [
            {from: FAIL, to: ERROR},
            {from: SUCCESS, to: ERROR},
            {from: SKIPPED, to: ERROR},

            {from: ERROR, to: FAIL},
            {from: SUCCESS, to: FAIL},
            {from: SKIPPED, to: FAIL},

            {from: ERROR, to: SUCCESS},
            {from: FAIL, to: SUCCESS},
            {from: SKIPPED, to: SUCCESS},

            {from: ERROR, to: SKIPPED},
            {from: FAIL, to: SKIPPED},
            {from: SUCCESS, to: SKIPPED}
        ].forEach(({from, to}) => {
            it(`should change suite status from ${from} to ${to}`, async () => {
                const srcDataSuites1 = mkSuiteTree({
                    suite: mkSuite({status: from}),
                    state: mkState({status: from}),
                    browsers: [mkBrowserResult({
                        name: 'yabro',
                        result: mkTestResult({status: from, attempt: 0})
                    })]
                });
                const srcDataSuites2 = mkSuiteTree({
                    browsers: [mkBrowserResult({
                        name: 'yabro',
                        result: mkTestResult({status: to, attempt: 0})
                    })]
                });

                const initialData = {suites: [srcDataSuites1]};
                const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

                const {suites} = await mkDataTree_(initialData).mergeWith(dataCollection);

                assert.equal(suites[0].status, to);
                assert.equal(suites[0].children[0].status, to);
            });
        });

        [
            {from: ERROR, to: ERROR, before: {b1: ERROR, b2: ERROR}, after: {b1: SKIPPED}},
            {from: ERROR, to: FAIL, before: {b1: ERROR, b2: SKIPPED}, after: {b1: FAIL}},
            {from: ERROR, to: SUCCESS, before: {b1: ERROR, b2: SKIPPED}, after: {b1: SUCCESS}},
            {from: ERROR, to: SKIPPED, before: {b1: ERROR, b2: SKIPPED}, after: {b1: SKIPPED}},

            {from: FAIL, to: ERROR, before: {b1: FAIL, b2: SKIPPED}, after: {b1: ERROR}},
            {from: FAIL, to: FAIL, before: {b1: ERROR, b2: SKIPPED}, after: {b1: FAIL}},
            {from: FAIL, to: SUCCESS, before: {b1: FAIL, b2: SKIPPED}, after: {b1: SUCCESS}},
            {from: FAIL, to: SKIPPED, before: {b1: FAIL, b2: SKIPPED}, after: {b1: SKIPPED}},

            {from: SUCCESS, to: ERROR, before: {b1: SUCCESS, b2: SUCCESS}, after: {b1: ERROR}},
            {from: SUCCESS, to: FAIL, before: {b1: SUCCESS, b2: SUCCESS}, after: {b1: FAIL}},
            {from: SUCCESS, to: SUCCESS, before: {b1: SUCCESS, b2: SUCCESS}, after: {b1: SKIPPED}},
            {from: SUCCESS, to: SKIPPED, before: {b1: SUCCESS, b2: SKIPPED}, after: {b1: SKIPPED}},

            {from: SKIPPED, to: ERROR, before: {b1: SKIPPED, b2: SKIPPED}, after: {b1: ERROR}},
            {from: SKIPPED, to: FAIL, before: {b1: SKIPPED, b2: SKIPPED}, after: {b1: FAIL}},
            {from: SKIPPED, to: SUCCESS, before: {b1: SKIPPED, b2: SKIPPED}, after: {b1: SUCCESS}},
            {from: SKIPPED, to: SKIPPED, before: {b1: SKIPPED, b2: SKIPPED}, after: {b1: SKIPPED}}
        ].forEach(({from, to, before, after}) => {
            const children = Object.values(Object.assign({}, before, after));

            it(`status should be "${to}" if children after merge are ${children.join('+')}`, async () => {
                const srcDataSuites1 = mkSuiteTree({
                    suite: mkSuite({status: from}),
                    state: mkState({status: from}),
                    browsers: Object.entries(before).map(([name, status]) => mkBrowserResult({
                        name,
                        result: mkTestResult({status, attempt: 0})
                    }))
                });
                const srcDataSuites2 = mkSuiteTree({
                    browsers: Object.entries(after).map(([name, status]) => mkBrowserResult({
                        name,
                        result: mkTestResult({status, attempt: 0})
                    }))
                });

                const initialData = {suites: [srcDataSuites1]};
                const dataCollection = {'src-report/path': {suites: [srcDataSuites2]}};

                const {suites} = await mkDataTree_(initialData).mergeWith(dataCollection);

                assert.sameMembers(suites[0].children[0].browsers.map(({result}) => result.status), children);
                assert.equal(suites[0].children[0].status, to);
                assert.equal(suites[0].status, to);
            });
        });
    });
});
