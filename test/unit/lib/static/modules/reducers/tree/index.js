const {SUCCESS, FAIL, ERROR, UPDATED, STAGED, COMMITED} = require('lib/constants/test-statuses');
const {CHECKED, UNCHECKED, INDETERMINATE} = require('lib/constants/checked-statuses');
const reducer = require('lib/static/modules/reducers/tree').default;
const actionNames = require('lib/static/modules/action-names').default;
const {ViewMode} = require('lib/constants/view-modes');
const {EXPAND_ALL, EXPAND_ERRORS, EXPAND_RETRIES} = require('lib/constants/expand-modes');
const {mkSuite, mkBrowser, mkResult, mkImage, mkStateTree, mkStateView} = require('../../../state-utils');
const {ErrorName} = require('lib/errors');

describe('lib/static/modules/reducers/tree', () => {
    [actionNames.INIT_GUI_REPORT, actionNames.INIT_STATIC_REPORT].forEach((actionName) => {
        describe(`${actionName} action`, () => {
            it('should set status from filtered browsers to parent suites', () => {
                const suitesById = {
                    ...mkSuite({id: 's1', status: FAIL, suiteIds: ['s2']}),
                    ...mkSuite({id: 's2', status: SUCCESS, parentId: 's1', browserIds: ['b1']})
                };
                const browsersById = mkBrowser({id: 'b1', name: 'yabro', parentId: 's2', resultIds: ['r1']});
                const resultsById = mkResult({id: 'r1', parentId: 'b1', status: ERROR});
                const tree = mkStateTree({suitesById, browsersById, resultsById});

                const filteredBrowsers = [{id: 'yabro', versions: []}];
                const state = {view: mkStateView({filteredBrowsers})};

                const newState = reducer(state, {
                    type: actionName,
                    payload: {tree}
                });

                assert.equal(newState.tree.suites.byId.s1.status, ERROR);
                assert.equal(newState.tree.suites.byId.s2.status, ERROR);
            });

            it('should correctly set status when suite has child suite and browser', () => {
                const suitesById = {
                    ...mkSuite({id: 's1', status: SUCCESS, suiteIds: ['s2'], browserIds: ['b1']}),
                    ...mkSuite({id: 's2', status: SUCCESS, parentId: 's1', browserIds: ['b2']})
                };
                const browsersById = {
                    ...mkBrowser({id: 'b1', name: 'yabro-1', parentId: 's1', resultIds: ['r1']}),
                    ...mkBrowser({id: 'b2', name: 'yabro-2', parentId: 's2', resultIds: ['r2']})
                };
                const resultsById = {
                    ...mkResult({id: 'r1', parentId: 'b1', status: FAIL}),
                    ...mkResult({id: 'r2', parentId: 'b2', status: ERROR})
                };
                const tree = mkStateTree({suitesById, browsersById, resultsById});

                const filteredBrowsers = [{id: 'yabro-1', versions: []}];
                const state = {view: mkStateView({filteredBrowsers})};

                const newState = reducer(state, {
                    type: actionName,
                    payload: {tree}
                });

                assert.equal(newState.tree.suites.byId.s1.status, FAIL);
                assert.equal(newState.tree.suites.byId.s2.status, SUCCESS);
            });

            describe('init suites states with', () => {
                describe('"shouldBeShown"', () => {
                    let suitesById, browsersById;

                    beforeEach(() => {
                        suitesById = {
                            ...mkSuite({id: 's1', suiteIds: ['s2']}),
                            ...mkSuite({id: 's2', browserIds: ['b1', 'b2'], parentId: 's1'})
                        };
                        browsersById = {
                            ...mkBrowser({id: 'b1', parentId: 's2', resultIds: ['r1']}),
                            ...mkBrowser({id: 'b2', parentId: 's2', resultIds: ['r2']})
                        };
                    });

                    describe('should be "true" if', () => {
                        it('one of the browsers are shown by view mode', () => {
                            const resultsById = {
                                ...mkResult({id: 'r1', parentId: 'b1', status: ERROR}),
                                ...mkResult({id: 'r2', parentId: 'b2', status: SUCCESS})
                            };

                            const tree = mkStateTree({suitesById, browsersById, resultsById});
                            const state = {view: mkStateView({viewMode: ViewMode.FAILED})};

                            const newState = reducer(state, {
                                type: actionName,
                                payload: {tree}
                            });

                            assert.equal(newState.tree.suites.stateById.s1.shouldBeShown, CHECKED);
                            assert.equal(newState.tree.suites.stateById.s2.shouldBeShown, CHECKED);
                        });

                        it('test name is matched on test filter', () => {
                            const resultsById = {
                                ...mkResult({id: 'r1', parentId: 'b1'}),
                                ...mkResult({id: 'r2', parentId: 'b2'})
                            };

                            const tree = mkStateTree({suitesById, browsersById, resultsById});
                            const state = {view: mkStateView({testNameFilter: 's2'})};

                            const newState = reducer(state, {
                                type: actionName,
                                payload: {tree}
                            });

                            assert.equal(newState.tree.suites.stateById.s1.shouldBeShown, CHECKED);
                            assert.equal(newState.tree.suites.stateById.s2.shouldBeShown, CHECKED);
                        });

                        it('child browser is shown by view mode but browsers from child suites not', () => {
                            const suitesById = {
                                ...mkSuite({id: 's1', suiteIds: ['s2'], browserIds: ['b1']}),
                                ...mkSuite({id: 's2', browserIds: ['b2'], parentId: 's1'})
                            };
                            const browsersById = {
                                ...mkBrowser({id: 'b1', parentId: 's1', resultIds: ['r1']}),
                                ...mkBrowser({id: 'b2', parentId: 's2', resultIds: ['r2']})
                            };
                            const resultsById = {
                                ...mkResult({id: 'r1', parentId: 'b1', status: ERROR}),
                                ...mkResult({id: 'r2', parentId: 'b2', status: SUCCESS})
                            };

                            const tree = mkStateTree({suitesById, browsersById, resultsById});
                            const state = {view: mkStateView({viewMode: ViewMode.FAILED})};

                            const newState = reducer(state, {
                                type: actionName,
                                payload: {tree}
                            });

                            assert.isTrue(newState.tree.suites.stateById.s1.shouldBeShown);
                            assert.isFalse(newState.tree.suites.stateById.s2.shouldBeShown);
                        });
                    });

                    describe('should be "false" if', () => {
                        it('browsers are not shown by view mode', () => {
                            const resultsById = {
                                ...mkResult({id: 'r1', parentId: 'b1', status: SUCCESS}),
                                ...mkResult({id: 'r2', parentId: 'b2', status: SUCCESS})
                            };

                            const tree = mkStateTree({suitesById, browsersById, resultsById});
                            const state = {view: mkStateView({viewMode: ViewMode.FAILED})};

                            const newState = reducer(state, {
                                type: actionName,
                                payload: {tree}
                            });

                            assert.isFalse(newState.tree.suites.stateById.s1.shouldBeShown);
                            assert.isFalse(newState.tree.suites.stateById.s2.shouldBeShown);
                        });

                        it('group by tests mode is enabled', () => {
                            const resultsById = {
                                ...mkResult({id: 'r1', parentId: 'b1', status: SUCCESS}),
                                ...mkResult({id: 'r2', parentId: 'b2', status: SUCCESS})
                            };

                            const tree = mkStateTree({suitesById, browsersById, resultsById});
                            const state = {view: mkStateView({keyToGroupTestsBy: 'foo.bar'})};

                            const newState = reducer(state, {
                                type: actionName,
                                payload: {tree}
                            });

                            assert.isFalse(newState.tree.suites.stateById.s1.shouldBeShown);
                            assert.isFalse(newState.tree.suites.stateById.s2.shouldBeShown);
                        });

                        it('test name is not matched on test filter', () => {
                            const resultsById = {
                                ...mkResult({id: 'r1', parentId: 'b1'}),
                                ...mkResult({id: 'r2', parentId: 'b2'})
                            };

                            const tree = mkStateTree({suitesById, browsersById, resultsById});
                            const state = {view: mkStateView({testNameFilter: 'some-name'})};

                            const newState = reducer(state, {
                                type: actionName,
                                payload: {tree}
                            });

                            assert.isFalse(newState.tree.suites.stateById.s1.shouldBeShown);
                            assert.isFalse(newState.tree.suites.stateById.s2.shouldBeShown);
                        });
                    });
                });

                describe('"shouldBeOpened"', () => {
                    describe('should be "true" if', () => {
                        [FAIL, ERROR].forEach((status) => {
                            it(`"errors" expanded and suite has ${status} status`, () => {
                                const suitesById = {...mkSuite({id: 's1', status})};
                                const tree = mkStateTree({suitesById});

                                const newState = reducer({view: mkStateView({expand: EXPAND_ERRORS})}, {
                                    type: actionName,
                                    payload: {tree}
                                });

                                assert.isTrue(newState.tree.suites.stateById.s1.shouldBeOpened);
                            });

                            describe('"retries" expanded and', () => {
                                it(`one child suite has retries with ${status} status`, () => {
                                    const suitesById = {
                                        ...mkSuite({id: 's1', suiteIds: ['s2', 's3'], status: SUCCESS}),
                                        ...mkSuite({id: 's2', parentId: 's1', browserIds: ['b1'], status: SUCCESS}),
                                        ...mkSuite({id: 's3', parentId: 's1', browserIds: ['b2'], status})
                                    };
                                    const browsersById = {
                                        ...mkBrowser({id: 'b1', parentId: 's2', resultIds: ['r1']}),
                                        ...mkBrowser({id: 'b2', parentId: 's3', resultIds: ['r2', 'r3']})
                                    };
                                    const resultsById = {
                                        ...mkResult({id: 'r1', status: SUCCESS}),
                                        ...mkResult({id: 'r2', status}),
                                        ...mkResult({id: 'r3', status: SUCCESS})
                                    };
                                    const tree = mkStateTree({suitesById, browsersById, resultsById});

                                    const newState = reducer({view: mkStateView({expand: EXPAND_RETRIES})}, {
                                        type: actionName,
                                        payload: {tree}
                                    });

                                    assert.isTrue(newState.tree.suites.stateById.s1.shouldBeOpened);
                                    assert.isFalse(newState.tree.suites.stateById.s2.shouldBeOpened);
                                    assert.isTrue(newState.tree.suites.stateById.s3.shouldBeOpened);
                                });

                                it(`child browser has retries but browsers from child suites not`, () => {
                                    const suitesById = {
                                        ...mkSuite({id: 's1', suiteIds: ['s2'], browserIds: ['b1']}),
                                        ...mkSuite({id: 's2', browserIds: ['b2'], parentId: 's1'})
                                    };
                                    const browsersById = {
                                        ...mkBrowser({id: 'b1', parentId: 's1', resultIds: ['r1', 'r2']}),
                                        ...mkBrowser({id: 'b2', parentId: 's2', resultIds: ['r3']})
                                    };
                                    const resultsById = {
                                        ...mkResult({id: 'r1', status}),
                                        ...mkResult({id: 'r2', status: SUCCESS}),
                                        ...mkResult({id: 'r3', status: SUCCESS})
                                    };
                                    const tree = mkStateTree({suitesById, browsersById, resultsById});

                                    const newState = reducer({view: mkStateView({expand: EXPAND_RETRIES})}, {
                                        type: actionName,
                                        payload: {tree}
                                    });

                                    assert.isTrue(newState.tree.suites.stateById.s1.shouldBeOpened);
                                    assert.isFalse(newState.tree.suites.stateById.s2.shouldBeOpened);
                                });
                            });
                        });

                        it(`"all" expanded and suite has ${SUCCESS} status`, () => {
                            const suitesById = {...mkSuite({id: 's1', status: SUCCESS})};
                            const tree = mkStateTree({suitesById});

                            const newState = reducer({view: mkStateView({expand: EXPAND_ALL})}, {
                                type: actionName,
                                payload: {tree}
                            });

                            assert.isTrue(newState.tree.suites.stateById.s1.shouldBeOpened);
                        });
                    });

                    describe('should be "false" if', () => {
                        it(`"errors" expanded and suite has ${SUCCESS} status`, () => {
                            const suitesById = {...mkSuite({id: 's1', status: SUCCESS})};
                            const tree = mkStateTree({suitesById});

                            const newState = reducer({view: mkStateView({expand: EXPAND_ERRORS})}, {
                                type: actionName,
                                payload: {tree}
                            });

                            assert.isFalse(newState.tree.suites.stateById.s1.shouldBeOpened);
                        });

                        it('"retries" expanded and suite has not retries', () => {
                            const suitesById = {...mkSuite({id: 's1', browserIds: ['b1'], status: SUCCESS})};
                            const browsersById = {...mkBrowser({id: 'b1', parentId: 's1', resultIds: ['r1']})};
                            const resultsById = {...mkResult({id: 'r1', status: SUCCESS})};
                            const tree = mkStateTree({suitesById, browsersById, resultsById});

                            const newState = reducer({view: mkStateView({expand: EXPAND_RETRIES})}, {
                                type: actionName,
                                payload: {tree}
                            });

                            assert.isFalse(newState.tree.suites.stateById.s1.shouldBeOpened);
                        });
                    });
                });

                describe('"checkStatus"', () => {
                    it('should be unchecked', () => {
                        const suitesById = {
                            ...mkSuite({id: 's1', suiteIds: ['s2'], status: SUCCESS}),
                            ...mkSuite({id: 's2', browserIds: ['b1', 'b2'], parentId: 's1', status: SUCCESS})
                        };
                        const browsersById = {
                            ...mkBrowser({id: 'b1', parentId: 's2', resultIds: ['r1']}),
                            ...mkBrowser({id: 'b2', parentId: 's2', resultIds: ['r2']})
                        };
                        const resultsById = {
                            ...mkResult({id: 'r1', status: SUCCESS}),
                            ...mkResult({id: 'r2', status: SUCCESS})
                        };
                        const tree = mkStateTree({suitesById, browsersById, resultsById});
                        const view = mkStateView();

                        const newState = reducer({view}, {
                            type: actionName,
                            payload: {tree}
                        });

                        assert.equal(newState.tree.suites.stateById.s1.checkStatus, UNCHECKED);
                        assert.equal(newState.tree.suites.stateById.s2.checkStatus, UNCHECKED);
                    });
                });
            });

            describe('init browsers states with', () => {
                describe('"retryIndex"', () => {
                    it('should set last result from browser as current retry', () => {
                        const suitesById = {...mkSuite({id: 's1', browserIds: ['b1', 'b2']})};
                        const browsersById = {
                            ...mkBrowser({id: 'b1', name: 'yabro', parentId: 's1', resultIds: ['r1']}),
                            ...mkBrowser({id: 'b2', name: 'yabro', parentId: 's1', resultIds: ['r2', 'r3']})
                        };
                        const resultsById = {
                            ...mkResult({id: 'r1', parentId: 'b1'}),
                            ...mkResult({id: 'r2', parentId: 'b2'}),
                            ...mkResult({id: 'r3', parentId: 'b2'})
                        };
                        const tree = mkStateTree({suitesById, browsersById, resultsById});

                        const newState = reducer({view: mkStateView({})}, {
                            type: actionName,
                            payload: {tree}
                        });

                        assert.equal(newState.tree.browsers.stateById.b1.retryIndex, 0);
                        assert.equal(newState.tree.browsers.stateById.b2.retryIndex, 1);
                    });
                });

                describe('"shouldBeShown"', () => {
                    describe('should be "true" if', () => {
                        it('test result status is matched on view mode', () => {
                            const suitesById = {...mkSuite({id: 's1', browserIds: ['b1']})};
                            const browsersById = {...mkBrowser({id: 'b1', parentId: 's1', resultIds: ['r1']})};
                            const resultsById = {...mkResult({id: 'r1', parentId: 'b1', status: ERROR})};

                            const tree = mkStateTree({suitesById, browsersById, resultsById});
                            const state = {view: mkStateView({viewMode: ViewMode.FAILED})};

                            const newState = reducer(state, {
                                type: actionName,
                                payload: {tree}
                            });

                            assert.isTrue(newState.tree.browsers.stateById.b1.shouldBeShown);
                        });

                        it('test name is matched on test filter', () => {
                            const suitesById = {...mkSuite({id: 's1', browserIds: ['b1']})};
                            const browsersById = {...mkBrowser({id: 'b1', parentId: 's1', resultIds: ['r1']})};
                            const resultsById = {...mkResult({id: 'r1', parentId: 'b1'})};

                            const tree = mkStateTree({suitesById, browsersById, resultsById});
                            const state = {view: mkStateView({testNameFilter: 's1'})};

                            const newState = reducer(state, {
                                type: actionName,
                                payload: {tree}
                            });

                            assert.isTrue(newState.tree.browsers.stateById.b1.shouldBeShown);
                        });

                        it('browser is matched on browsers filter', () => {
                            const suitesById = {...mkSuite({id: 's1', browserIds: ['b1']})};
                            const browsersById = {...mkBrowser({id: 'b1', name: 'yabro', parentId: 's1', resultIds: ['r1']})};
                            const resultsById = {...mkResult({id: 'r1', parentId: 'b1'})};

                            const tree = mkStateTree({suitesById, browsersById, resultsById});
                            const filteredBrowsers = [{id: 'yabro', versions: []}];
                            const state = {view: mkStateView({filteredBrowsers})};

                            const newState = reducer(state, {
                                type: actionName,
                                payload: {tree}
                            });

                            assert.isTrue(newState.tree.browsers.stateById.b1.shouldBeShown);
                        });
                    });

                    describe('should be "false" if', () => {
                        it('test result status is not matched on view mode', () => {
                            const suitesById = {...mkSuite({id: 's1', browserIds: ['b1']})};
                            const browsersById = {...mkBrowser({id: 'b1', parentId: 's1', resultIds: ['r1']})};
                            const resultsById = {...mkResult({id: 'r1', parentId: 'b1', status: SUCCESS})};

                            const tree = mkStateTree({suitesById, browsersById, resultsById});
                            const state = {view: mkStateView({viewMode: ViewMode.FAILED})};

                            const newState = reducer(state, {
                                type: actionName,
                                payload: {tree}
                            });

                            assert.isFalse(newState.tree.browsers.stateById.b1.shouldBeShown);
                        });

                        it('test name is not matched on test filter', () => {
                            const suitesById = {...mkSuite({id: 's1', browserIds: ['b1']})};
                            const browsersById = {...mkBrowser({id: 'b1', parentId: 's1', resultIds: ['r1']})};
                            const resultsById = {...mkResult({id: 'r1', parentId: 'b1'})};

                            const tree = mkStateTree({suitesById, browsersById, resultsById});
                            const state = {view: mkStateView({testNameFilter: 'some-name'})};

                            const newState = reducer(state, {
                                type: actionName,
                                payload: {tree}
                            });

                            assert.isFalse(newState.tree.browsers.stateById.b1.shouldBeShown);
                        });

                        it('browser is not matched on browsers filter', () => {
                            const suitesById = {...mkSuite({id: 's1', browserIds: ['b1']})};
                            const browsersById = {...mkBrowser({id: 'b1', name: 'yabro', parentId: 's1', resultIds: ['r1']})};
                            const resultsById = {...mkResult({id: 'r1', parentId: 'b1'})};

                            const tree = mkStateTree({suitesById, browsersById, resultsById});
                            const filteredBrowsers = [{id: 'chrome', versions: []}];
                            const state = {view: mkStateView({filteredBrowsers})};

                            const newState = reducer(state, {
                                type: actionName,
                                payload: {tree}
                            });

                            assert.isFalse(newState.tree.browsers.stateById.b1.shouldBeShown);
                        });

                        it('group by tests mode is enabled', () => {
                            const suitesById = {...mkSuite({id: 's1', browserIds: ['b1']})};
                            const browsersById = {...mkBrowser({id: 'b1', name: 'yabro', parentId: 's1', resultIds: ['r1']})};
                            const resultsById = {...mkResult({id: 'r1', parentId: 'b1'})};

                            const tree = mkStateTree({suitesById, browsersById, resultsById});
                            const state = {view: mkStateView({keyToGroupTestsBy: 'foo.bar'})};

                            const newState = reducer(state, {
                                type: actionName,
                                payload: {tree}
                            });

                            assert.isFalse(newState.tree.browsers.stateById.b1.shouldBeShown);
                        });
                    });
                });

                describe('"shouldBeOpened"', () => {
                    describe('should be "true" if', () => {
                        [FAIL, ERROR].forEach((status) => {
                            it(`"errors" expanded and browser has the last test result with ${status} status`, () => {
                                const suitesById = {...mkSuite({id: 's1', browserIds: ['b1']})};
                                const browsersById = {...mkBrowser({id: 'b1', parentId: 's1', resultIds: ['r1', 'r2']})};
                                const resultsById = {
                                    ...mkResult({id: 'r1', status: SUCCESS}),
                                    ...mkResult({id: 'r2', status})
                                };
                                const tree = mkStateTree({suitesById, browsersById, resultsById});

                                const newState = reducer({view: mkStateView({expand: EXPAND_ERRORS})}, {
                                    type: actionName,
                                    payload: {tree}
                                });

                                assert.isTrue(newState.tree.browsers.stateById.b1.shouldBeOpened);
                            });
                        });

                        [FAIL, ERROR].forEach((status) => {
                            it(`"retries" expanded and browser has test retry with ${status} status`, () => {
                                const suitesById = {...mkSuite({id: 's1', browserIds: ['b1']})};
                                const browsersById = {...mkBrowser({id: 'b1', parentId: 's1', resultIds: ['r1', 'r2']})};
                                const resultsById = {
                                    ...mkResult({id: 'r1', status}),
                                    ...mkResult({id: 'r2', status: SUCCESS})
                                };
                                const tree = mkStateTree({suitesById, browsersById, resultsById});

                                const newState = reducer({view: mkStateView({expand: EXPAND_RETRIES})}, {
                                    type: actionName,
                                    payload: {tree}
                                });

                                assert.isTrue(newState.tree.browsers.stateById.b1.shouldBeOpened);
                            });
                        });

                        it('"all" expanded and test success', () => {
                            const suitesById = {...mkSuite({id: 's1', browserIds: ['b1']})};
                            const browsersById = {...mkBrowser({id: 'b1', parentId: 's1', resultIds: ['r1']})};
                            const resultsById = {...mkResult({id: 'r1', status: SUCCESS})};
                            const tree = mkStateTree({suitesById, browsersById, resultsById});

                            const newState = reducer({view: mkStateView({expand: EXPAND_ALL})}, {
                                type: actionName,
                                payload: {tree}
                            });

                            assert.isTrue(newState.tree.browsers.stateById.b1.shouldBeOpened);
                        });
                    });

                    describe('should be "false" if', () => {
                        it(`"errors" expanded and browser has the last test result with ${SUCCESS} status`, () => {
                            const suitesById = {...mkSuite({id: 's1', browserIds: ['b1']})};
                            const browsersById = {...mkBrowser({id: 'b1', parentId: 's1', resultIds: ['r1']})};
                            const resultsById = {...mkResult({id: 'r1', status: SUCCESS})};
                            const tree = mkStateTree({suitesById, browsersById, resultsById});

                            const newState = reducer({view: mkStateView({expand: EXPAND_ERRORS})}, {
                                type: actionName,
                                payload: {tree}
                            });

                            assert.isFalse(newState.tree.browsers.stateById.b1.shouldBeOpened);
                        });

                        describe('"retries" expanded and browser', () => {
                            it('has not retries', () => {
                                const suitesById = {...mkSuite({id: 's1', browserIds: ['b1']})};
                                const browsersById = {...mkBrowser({id: 'b1', parentId: 's1', resultIds: ['r1']})};
                                const resultsById = {...mkResult({id: 'r1', status: SUCCESS})};
                                const tree = mkStateTree({suitesById, browsersById, resultsById});

                                const newState = reducer({view: mkStateView({expand: EXPAND_RETRIES})}, {
                                    type: actionName,
                                    payload: {tree}
                                });

                                assert.isFalse(newState.tree.browsers.stateById.b1.shouldBeOpened);
                            });

                            it(`has only ${SUCCESS} retries`, () => {
                                const suitesById = {...mkSuite({id: 's1', browserIds: ['b1']})};
                                const browsersById = {...mkBrowser({id: 'b1', parentId: 's1', resultIds: ['r1', 'r2']})};
                                const resultsById = {
                                    ...mkResult({id: 'r1', status: SUCCESS}),
                                    ...mkResult({id: 'r2', status: SUCCESS})
                                };
                                const tree = mkStateTree({suitesById, browsersById, resultsById});

                                const newState = reducer({view: mkStateView({expand: EXPAND_RETRIES})}, {
                                    type: actionName,
                                    payload: {tree}
                                });

                                assert.isFalse(newState.tree.browsers.stateById.b1.shouldBeOpened);
                            });
                        });
                    });
                });

                describe('"checkStatus"', () => {
                    it('should be unchecked', () => {
                        const suitesById = {
                            ...mkSuite({id: 's1', suiteIds: ['s2']}),
                            ...mkSuite({id: 's2', browserIds: ['b1', 'b2'], parentId: 's1'})
                        };
                        const browsersById = {
                            ...mkBrowser({id: 'b1', parentId: 's2', resultIds: ['r1']}),
                            ...mkBrowser({id: 'b2', parentId: 's2', resultIds: ['r2']})
                        };
                        const resultsById = {
                            ...mkResult({id: 'r1', status: SUCCESS}),
                            ...mkResult({id: 'r2', status: SUCCESS})
                        };
                        const tree = mkStateTree({suitesById, browsersById, resultsById});
                        const view = mkStateView();

                        const newState = reducer({view}, {
                            type: actionName,
                            payload: {tree}
                        });

                        assert.equal(newState.tree.browsers.stateById.b1.checkStatus, UNCHECKED);
                        assert.equal(newState.tree.browsers.stateById.b2.checkStatus, UNCHECKED);
                    });
                });
            });

            describe('init images states with "shouldBeOpened"', () => {
                describe('should be "true" if', () => {
                    [EXPAND_ERRORS, EXPAND_RETRIES].forEach((expand) => {
                        it(`"${expand}" expanded and test failed`, () => {
                            const imagesById = {...mkImage({id: 'i1', status: FAIL})};
                            const tree = mkStateTree({imagesById});

                            const newState = reducer({view: mkStateView({expand})}, {
                                type: actionName,
                                payload: {tree}
                            });

                            assert.isTrue(newState.tree.images.stateById.i1.shouldBeOpened);
                        });

                        it(`"${expand}" expanded and test errored`, () => {
                            const imagesById = {...mkImage({id: 'i1', status: ERROR})};
                            const tree = mkStateTree({imagesById});

                            const newState = reducer({view: mkStateView({expand})}, {
                                type: actionName,
                                payload: {tree}
                            });

                            assert.isTrue(newState.tree.images.stateById.i1.shouldBeOpened);
                        });
                    });

                    it('"all" expanded and test success', () => {
                        const imagesById = {...mkImage({id: 'i1', status: SUCCESS})};
                        const tree = mkStateTree({imagesById});

                        const newState = reducer({view: mkStateView({expand: EXPAND_ALL})}, {
                            type: actionName,
                            payload: {tree}
                        });

                        assert.isTrue(newState.tree.images.stateById.i1.shouldBeOpened);
                    });
                });

                describe('should be "false" if', () => {
                    [EXPAND_ERRORS, EXPAND_RETRIES].forEach((expand) => {
                        it(`"${expand}" expanded and test success`, () => {
                            const imagesById = {...mkImage({id: 'i1', status: SUCCESS})};
                            const tree = mkStateTree({imagesById});

                            const newState = reducer({view: mkStateView({expand})}, {
                                type: actionName,
                                payload: {tree}
                            });

                            assert.isFalse(newState.tree.images.stateById.i1.shouldBeOpened);
                        });

                        it(`"${expand}" expanded and test updated`, () => {
                            const imagesById = {...mkImage({id: 'i1', status: UPDATED})};
                            const tree = mkStateTree({imagesById});

                            const newState = reducer({view: mkStateView({expand})}, {
                                type: actionName,
                                payload: {tree}
                            });

                            assert.isFalse(newState.tree.images.stateById.i1.shouldBeOpened);
                        });
                    });
                });
            });

            describe('init result states with "matchedSelectedGroup"', () => {
                it('should be "false" by default', () => {
                    const resultsById = {...mkResult({id: 'r1'})};
                    const tree = mkStateTree({resultsById});

                    const newState = reducer({view: mkStateView()}, {
                        type: actionName,
                        payload: {tree}
                    });

                    assert.isFalse(newState.tree.results.stateById.r1.matchedSelectedGroup);
                });
            });
        });
    });

    [actionNames.TEST_BEGIN, actionNames.TEST_RESULT, actionNames.COMMIT_ACCEPTED_IMAGES_TO_TREE].forEach((actionName) => {
        describe(`${actionName} action`, () => {
            it('should change "retryIndex" in browser state', () => {
                const suitesById = {...mkSuite({id: 's1', browserIds: ['b1']})};
                const browsersById = {...mkBrowser({id: 'b1', name: 'yabro', parentId: 's1', resultIds: ['r1']})};
                const browsersStateById = {b1: {retryIndex: 0}};
                const resultsById = {...mkResult({id: 'r1', parentId: 'b1'})};
                const tree = mkStateTree({suitesById, browsersById, browsersStateById, resultsById});
                const view = mkStateView({filteredBrowsers: []});

                const newState = reducer({tree, view}, {
                    type: actionName,
                    payload: {
                        result: mkResult({id: 'r2', parentId: 'b1'}).r2,
                        images: [],
                        suites: []
                    }
                });

                assert.equal(tree.browsers.stateById.b1.retryIndex, 0);
                assert.equal(newState.tree.browsers.stateById.b1.retryIndex, 1);
            });
        });
    });

    [
        actionNames.VIEW_EXPAND_ALL, actionNames.VIEW_COLLAPSE_ALL,
        actionNames.VIEW_EXPAND_ERRORS, actionNames.VIEW_EXPAND_RETRIES
    ].forEach((actionName) => {
        describe(`${actionName} action`, () => {
            describe('recalc browsers state', () => {
                it('should not change "retryIndex" to the last result', () => {
                    const browsersById = {...mkBrowser({id: 'b1', resultIds: ['r1', 'r2']})};
                    const resultsById = {...mkResult({id: 'r1'}), ...mkResult({id: 'r2'})};
                    const browsersStateById = {b1: {retryIndex: 0}};
                    const tree = mkStateTree({browsersById, resultsById, browsersStateById});
                    const view = mkStateView();

                    const newState = reducer({tree, view}, {type: actionName});

                    assert.equal(newState.tree.browsers.stateById.b1.retryIndex, 0);
                });
            });
        });
    });

    describe(`${actionNames.VIEW_EXPAND_ALL} action`, () => {
        describe('should change "shouldBeOpened" to "true"', () => {
            it('in suites states', () => {
                const suitesById = {
                    ...mkSuite({id: 's1', suiteIds: ['s2']}),
                    ...mkSuite({id: 's2'})
                };
                const suitesStateById = {s1: {shouldBeOpened: false}, s2: {shouldBeOpened: false}};
                const tree = mkStateTree({suitesById, suitesStateById});

                const newState = reducer({tree}, {type: actionNames.VIEW_EXPAND_ALL});

                assert.isTrue(newState.tree.suites.stateById.s1.shouldBeOpened);
                assert.isTrue(newState.tree.suites.stateById.s2.shouldBeOpened);
            });

            it('in browsers states', () => {
                const browsersById = {...mkBrowser({id: 'b1', resultIds: ['r1']})};
                const resultsById = {...mkResult({id: 'r1'})};
                const browsersStateById = {b1: {shouldBeOpened: false}};
                const tree = mkStateTree({browsersById, resultsById, browsersStateById});

                const newState = reducer({tree}, {type: actionNames.VIEW_EXPAND_ALL});

                assert.isTrue(newState.tree.browsers.stateById.b1.shouldBeOpened);
            });

            it('in images states', () => {
                const imagesById = {...mkImage({id: 'i1'})};
                const imagesStateById = {i1: {shouldBeOpened: false}};
                const tree = mkStateTree({imagesById, imagesStateById});

                const newState = reducer({tree}, {type: actionNames.VIEW_EXPAND_ALL});

                assert.isTrue(newState.tree.images.stateById.i1.shouldBeOpened);
            });
        });
    });

    describe(`${actionNames.VIEW_COLLAPSE_ALL} action`, () => {
        describe('should change "shouldBeOpened" to "false"', () => {
            it('in suites states', () => {
                const suitesById = {
                    ...mkSuite({id: 's1', suiteIds: ['s2']}),
                    ...mkSuite({id: 's2'})
                };
                const suitesStateById = {s1: {shouldBeOpened: true}, s2: {shouldBeOpened: true}};
                const tree = mkStateTree({suitesById, suitesStateById});

                const newState = reducer({tree}, {type: actionNames.VIEW_COLLAPSE_ALL});

                assert.isFalse(newState.tree.suites.stateById.s1.shouldBeOpened);
                assert.isFalse(newState.tree.suites.stateById.s2.shouldBeOpened);
            });

            it('in browsers states', () => {
                const browsersById = {...mkBrowser({id: 'b1', resultIds: ['r1']})};
                const resultsById = {...mkResult({id: 'r1'})};
                const browsersStateById = {b1: {shouldBeOpened: false}};
                const tree = mkStateTree({browsersById, resultsById, browsersStateById});

                const newState = reducer({tree}, {type: actionNames.VIEW_COLLAPSE_ALL});

                assert.isFalse(newState.tree.browsers.stateById.b1.shouldBeOpened);
            });

            it('in images states', () => {
                const imagesById = {...mkImage({id: 'i1'})};
                const imagesStateById = {i1: {shouldBeOpened: true}};
                const tree = mkStateTree({imagesById, imagesStateById});

                const newState = reducer({tree}, {type: actionNames.VIEW_COLLAPSE_ALL});

                assert.isFalse(newState.tree.images.stateById.i1.shouldBeOpened);
            });
        });
    });

    describe(`${actionNames.VIEW_EXPAND_ERRORS} action`, () => {
        describe('recalc suites state', () => {
            [FAIL, ERROR].forEach((status) => {
                it(`should change "shouldBeOpened" to "true" for suite with ${status} status`, () => {
                    const suitesById = {...mkSuite({id: 's1', status})};
                    const suitesStateById = {s1: {shouldBeOpened: false}};
                    const tree = mkStateTree({suitesById, suitesStateById});
                    const view = mkStateView({expand: EXPAND_ERRORS});

                    const newState = reducer({tree, view}, {type: actionNames.VIEW_EXPAND_ERRORS});

                    assert.isTrue(newState.tree.suites.stateById.s1.shouldBeOpened);
                });
            });
        });

        describe('recalc browsers state', () => {
            [FAIL, ERROR].forEach((status) => {
                it(`should change "shouldBeOpened" to "true" for browser with the last result on ${status} status`, () => {
                    const browsersById = {...mkBrowser({id: 'b1', resultIds: ['r1']})};
                    const resultsById = {...mkResult({id: 'r1', status})};
                    const browsersStateById = {b1: {shouldBeOpened: false}};
                    const tree = mkStateTree({browsersById, resultsById, browsersStateById});
                    const view = mkStateView({expand: EXPAND_ERRORS});

                    const newState = reducer({tree, view}, {type: actionNames.VIEW_EXPAND_ERRORS});

                    assert.isTrue(newState.tree.browsers.stateById.b1.shouldBeOpened);
                });
            });
        });

        describe('recalc images state', () => {
            [FAIL, ERROR].forEach((status) => {
                it(`should change "shouldBeOpened" to "true" for ${status} test`, () => {
                    const imagesById = {...mkImage({id: 'i1', status})};
                    const imagesStateById = {i1: {shouldBeOpened: false}};
                    const tree = mkStateTree({imagesById, imagesStateById});
                    const view = mkStateView({expand: EXPAND_ERRORS});

                    const newState = reducer({tree, view}, {type: actionNames.VIEW_EXPAND_ERRORS});

                    assert.isTrue(newState.tree.images.stateById.i1.shouldBeOpened);
                });
            });
        });
    });

    describe(`${actionNames.VIEW_EXPAND_RETRIES} action`, () => {
        describe('recalc suites state', () => {
            [FAIL, ERROR].forEach((status) => {
                it(`should change "shouldBeOpened" to "true" for suite that has retries with ${status} status`, () => {
                    const suitesById = {...mkSuite({id: 's1', browserIds: ['b1']})};
                    const browsersById = {...mkBrowser({id: 'b1', parentId: 's1', resultIds: ['r1', 'r2']})};
                    const resultsById = {...mkResult({id: 'r1', status}), ...mkResult({id: 'r2', status: SUCCESS})};
                    const suitesStateById = {s1: {shouldBeOpened: false}};
                    const tree = mkStateTree({suitesById, suitesStateById, browsersById, resultsById});
                    const view = mkStateView({expand: EXPAND_RETRIES});

                    const newState = reducer({tree, view}, {type: actionNames.VIEW_EXPAND_ERRORS});

                    assert.isTrue(newState.tree.suites.stateById.s1.shouldBeOpened);
                });
            });
        });

        describe('recalc browsers state', () => {
            [FAIL, ERROR].forEach((status) => {
                it(`should change "shouldBeOpened" to "true" for browser with test retry on ${status} status`, () => {
                    const browsersById = {...mkBrowser({id: 'b1', resultIds: ['r1', 'r2']})};
                    const resultsById = {
                        ...mkResult({id: 'r1', status}),
                        ...mkResult({id: 'r2', status: SUCCESS})
                    };
                    const browsersStateById = {b1: {shouldBeOpened: false}};
                    const tree = mkStateTree({browsersById, resultsById, browsersStateById});
                    const view = mkStateView({expand: EXPAND_RETRIES});

                    const newState = reducer({tree, view}, {type: actionNames.VIEW_EXPAND_RETRIES});

                    assert.isTrue(newState.tree.browsers.stateById.b1.shouldBeOpened);
                });
            });
        });

        describe('recalc images state', () => {
            [FAIL, ERROR].forEach((status) => {
                it(`should change "shouldBeOpened" to "true" for ${status} test`, () => {
                    const imagesById = {...mkImage({id: 'i1', status})};
                    const imagesStateById = {i1: {shouldBeOpened: false}};
                    const tree = mkStateTree({imagesById, imagesStateById});
                    const view = mkStateView({expand: EXPAND_RETRIES});

                    const newState = reducer({tree, view}, {type: actionNames.VIEW_EXPAND_RETRIES});

                    assert.isTrue(newState.tree.images.stateById.i1.shouldBeOpened);
                });
            });
        });
    });

    describe(`${actionNames.CLOSE_SECTIONS} action`, () => {
        it('should change "shouldBeOpened" state to "false" for passed images', () => {
            const imagesById = {...mkImage({id: 'i1'}), ...mkImage({id: 'i2'})};
            const imagesStateById = {i1: {shouldBeOpened: true}, i2: {shouldBeOpened: true}};
            const tree = mkStateTree({imagesById, imagesStateById});

            const newState = reducer({tree}, {type: actionNames.CLOSE_SECTIONS, payload: ['i2']});

            assert.isTrue(newState.tree.images.stateById.i1.shouldBeOpened);
            assert.isFalse(newState.tree.images.stateById.i2.shouldBeOpened);
        });
    });

    describe(`${actionNames.BROWSERS_SELECTED} action`, () => {
        it('should set status from selected browser to parent suites', () => {
            const suitesById = {
                ...mkSuite({id: 's1', status: FAIL, suiteIds: ['s2']}),
                ...mkSuite({id: 's2', status: SUCCESS, parentId: 's1', browserIds: ['b1']})
            };
            const browsersById = mkBrowser({id: 'b1', name: 'yabro', parentId: 's2', resultIds: ['r1']});
            const resultsById = mkResult({id: 'r1', parentId: 'b1', status: ERROR});
            const browsersStateById = {'b1': {checkStatus: UNCHECKED}};
            const tree = mkStateTree({suitesById, browsersById, resultsById, browsersStateById});

            const filteredBrowsers = [{id: 'yabro', versions: []}];
            const view = mkStateView({filteredBrowsers});

            const newState = reducer({tree, view}, {
                type: actionNames.BROWSERS_SELECTED,
                payload: {browsers: filteredBrowsers}
            });

            assert.equal(newState.tree.suites.byId.s1.status, ERROR);
            assert.equal(newState.tree.suites.byId.s2.status, ERROR);
        });

        it('should correctly set status when suite has child suite and browser', () => {
            const suitesById = {
                ...mkSuite({id: 's1', status: SUCCESS, suiteIds: ['s2'], browserIds: ['b1']}),
                ...mkSuite({id: 's2', status: SUCCESS, parentId: 's1', browserIds: ['b2']})
            };
            const browsersById = {
                ...mkBrowser({id: 'b1', name: 'yabro-1', parentId: 's1', resultIds: ['r1']}),
                ...mkBrowser({id: 'b2', name: 'yabro-2', parentId: 's2', resultIds: ['r2']})
            };
            const resultsById = {
                ...mkResult({id: 'r1', parentId: 'b1', status: FAIL}),
                ...mkResult({id: 'r2', parentId: 'b2', status: ERROR})
            };
            const browsersStateById = {'b1': {checkStatus: UNCHECKED}};
            const tree = mkStateTree({suitesById, browsersById, resultsById, browsersStateById});

            const filteredBrowsers = [{id: 'yabro-1', versions: []}];
            const view = mkStateView({filteredBrowsers});

            const newState = reducer({tree, view}, {
                type: actionNames.BROWSERS_SELECTED,
                payload: {browsers: filteredBrowsers}
            });

            assert.equal(newState.tree.suites.byId.s1.status, FAIL);
            assert.equal(newState.tree.suites.byId.s2.status, SUCCESS);
        });

        it('should correctly set suite status when filteredBrowsers is empty', () => {
            const suitesById = mkSuite({id: 's1', status: FAIL, browserIds: ['b1']});
            const browsersById = mkBrowser({id: 'b1', name: 'yabro-1', parentId: 's1', resultIds: ['r1']});
            const resultsById = mkResult({id: 'r1', parentId: 'b1', status: FAIL});
            const browsersStateById = {'b1': {checkStatus: UNCHECKED}};
            const tree = mkStateTree({suitesById, browsersById, resultsById, browsersStateById});
            const view = mkStateView({filteredBrowsers: [{id: 'yabro-1', versions: []}]});

            const newState = reducer({tree, view}, {
                type: actionNames.BROWSERS_SELECTED,
                payload: {browsers: []}
            });

            assert.equal(newState.tree.suites.byId.s1.status, FAIL);
        });
    });

    describe(`${actionNames.CHANGE_TEST_RETRY} action`, () => {
        it('should change retry index', () => {
            const browsersById = {...mkBrowser({id: 'b1'})};
            const browsersStateById = {b1: {retryIndex: 1}};
            const tree = mkStateTree({browsersById, browsersStateById});

            const newState = reducer({tree, view: mkStateView()}, {
                type: actionNames.CHANGE_TEST_RETRY,
                payload: {browserId: 'b1', retryIndex: 100500}
            });

            assert.deepEqual(newState.tree.browsers.stateById.b1, {retryIndex: 100500});
        });

        it('should reset last matched retry index if group tests mode is enablde', () => {
            const browsersById = {...mkBrowser({id: 'b1'})};
            const browsersStateById = {b1: {retryIndex: 1, lastMatchedRetryIndex: 0}};
            const tree = mkStateTree({browsersById, browsersStateById});
            const view = mkStateView({keyToGroupTestsBy: 'some-key'});

            const newState = reducer({tree, view}, {
                type: actionNames.CHANGE_TEST_RETRY,
                payload: {browserId: 'b1', retryIndex: 100500}
            });

            assert.deepEqual(newState.tree.browsers.stateById.b1, {retryIndex: 100500, lastMatchedRetryIndex: null});
        });
    });

    describe(`${actionNames.TOGGLE_TESTS_GROUP} action`, () => {
        describe('if group tests is closed', () => {
            it('should close all browsers', () => {
                const browsersById = {...mkBrowser({id: 'b1'}), ...mkBrowser({id: 'b2'})};
                const browsersStateById = {b1: {shouldBeShown: true}, b2: {shouldBeShown: true}};
                const tree = mkStateTree({browsersById, browsersStateById});

                const newState = reducer({tree, view: mkStateView()}, {
                    type: actionNames.TOGGLE_TESTS_GROUP,
                    payload: {isActive: false}
                });

                assert.isFalse(newState.tree.browsers.stateById.b1.shouldBeShown);
                assert.isFalse(newState.tree.browsers.stateById.b2.shouldBeShown);
            });

            it('should reset last matched retry index for each browser', () => {
                const browsersById = {...mkBrowser({id: 'b1'}), ...mkBrowser({id: 'b2'})};
                const browsersStateById = {b1: {lastMatchedRetryIndex: 1}, b2: {lastMatchedRetryIndex: 2}};
                const tree = mkStateTree({browsersById, browsersStateById});

                const newState = reducer({tree, view: mkStateView()}, {
                    type: actionNames.TOGGLE_TESTS_GROUP,
                    payload: {isActive: false}
                });

                assert.isNull(newState.tree.browsers.stateById.b1.lastMatchedRetryIndex);
                assert.isNull(newState.tree.browsers.stateById.b2.lastMatchedRetryIndex);
            });

            it('should close all suites', () => {
                const suitesById = {...mkSuite({id: 's1'}), ...mkSuite({id: 's2'})};
                const suitesStateById = {s1: {shouldBeShown: true}, s2: {shouldBeShown: true}};
                const tree = mkStateTree({suitesById, suitesStateById});

                const newState = reducer({tree, view: mkStateView()}, {
                    type: actionNames.TOGGLE_TESTS_GROUP,
                    payload: {isActive: false}
                });

                assert.isFalse(newState.tree.suites.stateById.s1.shouldBeShown);
                assert.isFalse(newState.tree.suites.stateById.s2.shouldBeShown);
            });

            it('should reset flag of matching result to selected group for each results', () => {
                const resultsById = {...mkResult({id: 'r1'}), ...mkResult({id: 'r2'})};
                const resultsStateById = {r1: {matchedSelectedGroup: true}, r2: {matchedSelectedGroup: true}};
                const tree = mkStateTree({resultsById, resultsStateById});

                const newState = reducer({tree, view: mkStateView()}, {
                    type: actionNames.TOGGLE_TESTS_GROUP,
                    payload: {isActive: false}
                });

                assert.isFalse(newState.tree.results.stateById.r1.matchedSelectedGroup);
                assert.isFalse(newState.tree.results.stateById.r2.matchedSelectedGroup);
            });
        });

        describe('if group tests is opened', () => {
            it('should not modify result states if browser is not matched by status filter', () => {
                const browsersById = {...mkBrowser({id: 'b1', resultIds: ['r1', 'r2']})};
                const resultsById = {...mkResult({id: 'r1', status: SUCCESS}), ...mkResult({id: 'r2', status: SUCCESS})};
                const resultsStateById = {r1: {}, r2: {}};
                const tree = mkStateTree({browsersById, resultsById, resultsStateById});
                const view = mkStateView({viewMode: ViewMode.FAILED});

                const newState = reducer({tree, view}, {
                    type: actionNames.TOGGLE_TESTS_GROUP,
                    payload: {isActive: true, browserIds: ['b1']}
                });

                assert.deepEqual(newState.tree.results.stateById.r1, {});
                assert.deepEqual(newState.tree.results.stateById.r2, {});
            });

            it('should not modify result states for browser that is not matched by selected group', () => {
                const browsersById = {...mkBrowser({id: 'b1', resultIds: ['r1']}), ...mkBrowser({id: 'b2', resultIds: ['r2']})};
                const browsersStateById = {b1: {shouldBeShown: true}, b2: {shouldBeShown: true}};
                const resultsById = {...mkResult({id: 'r1', status: SUCCESS}), ...mkResult({id: 'r2', status: SUCCESS})};
                const resultsStateById = {r1: {}, r2: {}};
                const tree = mkStateTree({browsersById, browsersStateById, resultsById, resultsStateById});

                const newState = reducer({tree, view: mkStateView()}, {
                    type: actionNames.TOGGLE_TESTS_GROUP,
                    payload: {isActive: true, browserIds: ['b2'], resultIds: ['r2']}
                });

                assert.deepEqual(newState.tree.results.stateById.r1, {});
                assert.isFalse(newState.tree.browsers.stateById.b1.shouldBeShown);
            });

            describe('if result is not matches by selected group', () => {
                it('should set "matchedSelectedGroup" flag with "false" value', () => {
                    const browsersById = {...mkBrowser({id: 'b1', resultIds: ['r1']})};
                    const resultsById = {...mkResult({id: 'r1', status: SUCCESS})};
                    const resultsStateById = {r1: {}, r2: {}};
                    const browsersStateById = {'b1': {checkStatus: UNCHECKED}};
                    const tree = mkStateTree({browsersById, resultsById, resultsStateById, browsersStateById});

                    const newState = reducer({tree, view: mkStateView()}, {
                        type: actionNames.TOGGLE_TESTS_GROUP,
                        payload: {isActive: true, browserIds: ['b1'], resultIds: ['r2']}
                    });

                    assert.deepEqual(newState.tree.results.stateById.r1, {matchedSelectedGroup: false});
                });
            });

            describe('if one of results is matches by selected group', () => {
                it('should set "matchedSelectedGroup" flag with "true" value for matched result', () => {
                    const browsersById = {...mkBrowser({id: 'b1', resultIds: ['r1', 'r2']})};
                    const resultsById = {...mkResult({id: 'r1', status: SUCCESS}), ...mkResult({id: 'r2', status: SUCCESS})};
                    const resultsStateById = {r1: {}, r2: {}};
                    const browsersStateById = {'b1': {checkStatus: UNCHECKED}};
                    const tree = mkStateTree({browsersById, resultsById, resultsStateById, browsersStateById});

                    const newState = reducer({tree, view: mkStateView()}, {
                        type: actionNames.TOGGLE_TESTS_GROUP,
                        payload: {isActive: true, browserIds: ['b1'], resultIds: ['r2']}
                    });

                    assert.deepEqual(newState.tree.results.stateById.r1, {matchedSelectedGroup: false});
                    assert.deepEqual(newState.tree.results.stateById.r2, {matchedSelectedGroup: true});
                });
            });

            it('should set last matched retry index for browser matches on group', () => {
                const browsersById = {...mkBrowser({id: 'b1', resultIds: ['r1', 'r2', 'r3']})};
                const resultsById = {
                    ...mkResult({id: 'r1', status: SUCCESS}),
                    ...mkResult({id: 'r2', status: SUCCESS}),
                    ...mkResult({id: 'r3', status: SUCCESS})
                };
                const browsersStateById = {'b1': {checkStatus: UNCHECKED}};
                const tree = mkStateTree({browsersById, resultsById, browsersStateById});

                const newState = reducer({tree, view: mkStateView()}, {
                    type: actionNames.TOGGLE_TESTS_GROUP,
                    payload: {isActive: true, browserIds: ['b1'], resultIds: ['r1', 'r2']}
                });

                assert.equal(newState.tree.browsers.stateById.b1.lastMatchedRetryIndex, 1);
            });
        });
    });

    describe(`${actionNames.GROUP_TESTS_BY_KEY} action`, () => {
        [
            {
                keyAction: 'selected',
                view: mkStateView({keyToGroupTestsBy: 'some-key'})
            },
            {
                keyAction: 'cleared',
                view: mkStateView({keyToGroupTestsBy: ''})
            }
        ].forEach(({keyAction, view}) => {
            describe(`if key is ${keyAction} in group tests select`, () => {
                it('should reset flag of matching result to selected group for each results', () => {
                    const resultsById = {...mkResult({id: 'r1'}), ...mkResult({id: 'r2'})};
                    const resultsStateById = {r1: {matchedSelectedGroup: true}, r2: {matchedSelectedGroup: true}};
                    const tree = mkStateTree({resultsById, resultsStateById});

                    const newState = reducer({tree, view}, {type: actionNames.GROUP_TESTS_BY_KEY});

                    assert.isFalse(newState.tree.results.stateById.r1.matchedSelectedGroup);
                    assert.isFalse(newState.tree.results.stateById.r2.matchedSelectedGroup);
                });

                it('should reset last matched retry index for each browser', () => {
                    const browsersById = {...mkBrowser({id: 'b1'}), ...mkBrowser({id: 'b2'})};
                    const browsersStateById = {b1: {lastMatchedRetryIndex: 1}, b2: {lastMatchedRetryIndex: 2}};
                    const tree = mkStateTree({browsersById, browsersStateById});
                    const view = mkStateView({keyToGroupTestsBy: 'some-key'});

                    const newState = reducer({tree, view}, {type: actionNames.GROUP_TESTS_BY_KEY});

                    assert.isNull(newState.tree.browsers.stateById.b1.lastMatchedRetryIndex);
                    assert.isNull(newState.tree.browsers.stateById.b2.lastMatchedRetryIndex);
                });
            });
        });

        describe('if key is cleared in group tests select', () => {
            it('should calculate browser showness', () => {
                const browsersById = {...mkBrowser({id: 'b1', resultIds: ['r1']}), ...mkBrowser({id: 'b2', resultIds: ['r2']})};
                const browsersStateById = {b1: {shouldBeShown: false}, b2: {shouldBeShown: false}};
                const resultsById = {...mkResult({id: 'r1', status: SUCCESS}), ...mkResult({id: 'r2', status: SUCCESS})};
                const tree = mkStateTree({browsersById, browsersStateById, resultsById});
                const view = mkStateView({keyToGroupTestsBy: ''});

                const newState = reducer({tree, view}, {type: actionNames.GROUP_TESTS_BY_KEY});

                assert.isTrue(newState.tree.browsers.stateById.b1.shouldBeShown);
                assert.isTrue(newState.tree.browsers.stateById.b2.shouldBeShown);
            });

            it('should calculate suite showness', () => {
                const suitesById = {...mkSuite({id: 's1', browserIds: ['b1']}), ...mkSuite({id: 's2', browserIds: ['b2']})};
                const suitesStateById = {s1: {shouldBeShown: false}, s2: {shouldBeShown: false}};
                const browsersById = {...mkBrowser({id: 'b1', resultIds: ['r1']}), ...mkBrowser({id: 'b2', resultIds: ['r2']})};
                const browsersStateById = {b1: {shouldBeShown: false}, b2: {shouldBeShown: false}};
                const resultsById = {...mkResult({id: 'r1', status: SUCCESS}), ...mkResult({id: 'r2', status: SUCCESS})};
                const tree = mkStateTree({suitesById, suitesStateById, browsersById, browsersStateById, resultsById});
                const view = mkStateView({keyToGroupTestsBy: ''});

                const newState = reducer({tree, view}, {type: actionNames.GROUP_TESTS_BY_KEY});

                assert.isTrue(newState.tree.suites.stateById.s1.shouldBeShown);
                assert.isTrue(newState.tree.suites.stateById.s2.shouldBeShown);
            });
        });
    });

    describe(`${actionNames.COMMIT_REVERTED_IMAGES_TO_TREE} action`, () => {
        const mkTree_ = () => mkStateTree({
            suitesById: mkSuite({id: 's', status: SUCCESS, browserIds: ['b']}),
            browsersById: mkBrowser({id: 'b', name: 'yabro', parentId: 's', resultIds: ['r1']}),
            browsersStateById: {'b': {retryIndex: 1}},
            imagesStateById: {'i1': {shouldBeOpened: false}, 'i2': {shouldBeOpened: false}},
            resultsById: {
                ...mkResult({id: 'r1', parentId: 'b', status: SUCCESS, imageIds: ['i1']}),
                ...mkResult({id: 'r2', parentId: 'b', status: SUCCESS, imageIds: ['i2']})
            },
            imagesById: {
                ...mkImage({id: 'i1', parentId: 'r1', status: UPDATED}),
                ...mkImage({id: 'i2', parentId: 'r2', status: UPDATED})
            }
        });

        it('should update image', () => {
            const tree = mkTree_();
            const view = mkStateView();
            const updatedImage = {id: 'i1', parentId: 'r1', status: FAIL};

            const {tree: newTree} = reducer({tree, view}, {
                type: actionNames.COMMIT_REVERTED_IMAGES_TO_TREE,
                payload: {updatedImages: [updatedImage]}
            });

            assert.equal(newTree.images.byId['i1'].status, FAIL);
        });

        it('should expand updated image', () => {
            const tree = mkTree_();
            const view = mkStateView();
            const updatedImage = {id: 'i1', parentId: 'r1', status: FAIL};

            const {tree: newTree} = reducer({tree, view}, {
                type: actionNames.COMMIT_REVERTED_IMAGES_TO_TREE,
                payload: {updatedImages: [updatedImage]}
            });

            assert.isTrue(newTree.images.stateById['i1'].shouldBeOpened);
        });

        it('should remove result', () => {
            const tree = mkTree_();
            const view = mkStateView();

            const {tree: newTree} = reducer({tree, view}, {
                type: actionNames.COMMIT_REVERTED_IMAGES_TO_TREE,
                payload: {removedResults: ['r2']}
            });

            assert.deepEqual(newTree.results.allIds, ['r1']);
            assert.deepEqual(Object.keys(newTree.results.byId), ['r1']);
            assert.deepEqual(newTree.browsers.byId.b.resultIds, ['r1']);

            assert.deepEqual(Object.keys(newTree.images.byId), ['i1']);
            assert.deepEqual(Object.keys(newTree.images.stateById), ['i1']);
            assert.deepEqual(newTree.images.allIds, ['i1']);

            assert.equal(newTree.browsers.stateById.b.retryIndex, 0);
        });

        it('should mark suite as failed', () => {
            const tree = mkTree_();
            const view = mkStateView();
            const updatedImage = {id: 'i1', parentId: 'r1', status: FAIL};

            const {tree: newTree} = reducer({tree, view}, {
                type: actionNames.COMMIT_REVERTED_IMAGES_TO_TREE,
                payload: {updatedImages: [updatedImage]}
            });

            assert.equal(newTree.suites.byId.s.status, FAIL);
            assert.deepEqual(newTree.suites.failedRootIds, ['s']);
        });
    });

    describe(`${actionNames.TOGGLE_BROWSER_CHECKBOX} action`, () => {
        [CHECKED, UNCHECKED].forEach(checkStatus => {
            it(`should set browser checkbox to ${checkStatus ? '' : 'un'}checked state`, () => {
                const suitesById = mkSuite({id: 's1', browserIds: ['b1']});
                const browsersById = mkBrowser({id: 'b1', parentId: 's1'});
                const suitesStateById = {s1: {shouldBeShown: true, checkStatus: Number(!checkStatus)}};
                const browsersStateById = {b1: {shouldBeShown: true, checkStatus: Number(!checkStatus)}};
                const tree = mkStateTree({suitesById, suitesStateById, browsersById, browsersStateById});
                const view = mkStateView({keyToGroupTestsBy: ''});

                const newState = reducer({tree, view}, {
                    type: actionNames.TOGGLE_BROWSER_CHECKBOX,
                    payload: {suiteBrowserId: 'b1', checkStatus}
                });

                assert.equal(newState.tree.browsers.stateById.b1.checkStatus, checkStatus);
            });

            it(`should not change ${checkStatus ? '' : 'un'}checked state`, () => {
                const suitesById = mkSuite({id: 's1', browserIds: ['b1']});
                const browsersById = mkBrowser({id: 'b1', parentId: 's1'});
                const suitesStateById = {s1: {shouldBeShown: true, checkStatus}};
                const browsersStateById = {b1: {shouldBeShown: true, checkStatus}};
                const tree = mkStateTree({suitesById, suitesStateById, browsersById, browsersStateById});
                const view = mkStateView({keyToGroupTestsBy: ''});

                const newState = reducer({tree, view}, {
                    type: actionNames.TOGGLE_BROWSER_CHECKBOX,
                    payload: {suiteBrowserId: 'b1', checkStatus}
                });

                assert.equal(newState.tree.browsers.stateById.b1.checkStatus, checkStatus);
            });

            it(`should update parents to ${checkStatus ? '' : 'un'}checked state`, () => {
                const suitesById = {
                    ...mkSuite({id: 's0', suiteIds: ['s1']}),
                    ...mkSuite({id: 's1', browserIds: ['b1'], parentId: 's0'})
                };
                const browsersById = mkBrowser({id: 'b1', parentId: 's1'});
                const suitesStateById = {
                    s0: {shouldBeShown: true, checkStatus: Number(!checkStatus)},
                    s1: {shouldBeShown: true, checkStatus: Number(!checkStatus)}
                };
                const browsersStateById = {b1: {shouldBeShown: true, checkStatus: Number(!checkStatus)}};
                const tree = mkStateTree({suitesById, suitesStateById, browsersById, browsersStateById});
                const view = mkStateView({keyToGroupTestsBy: ''});

                const newState = reducer({tree, view}, {
                    type: actionNames.TOGGLE_BROWSER_CHECKBOX,
                    payload: {suiteBrowserId: 'b1', checkStatus}
                });

                assert.equal(newState.tree.suites.stateById.s1.checkStatus, checkStatus);
                assert.equal(newState.tree.suites.stateById.s0.checkStatus, checkStatus);
            });

            it(`should update parents to indeterminate from ${checkStatus ? '' : 'un'}checked state`, () => {
                const suitesById = {
                    ...mkSuite({id: 's0', suiteIds: ['s1']}),
                    ...mkSuite({id: 's1', browserIds: ['b1', 'b2'], parentId: 's0'})
                };
                const browsersById = {
                    ...mkBrowser({id: 'b1', parentId: 's1'}),
                    ...mkBrowser({id: 'b2', parentId: 's1'})
                };
                const suitesStateById = {
                    s0: {shouldBeShown: true, checkStatus},
                    s1: {shouldBeShown: true, checkStatus}
                };
                const browsersStateById = {
                    b1: {shouldBeShown: true, checkStatus},
                    b2: {shouldBeShown: true, checkStatus}
                };
                const tree = mkStateTree({suitesById, suitesStateById, browsersById, browsersStateById});
                const view = mkStateView({keyToGroupTestsBy: ''});

                const newState = reducer({tree, view}, {
                    type: actionNames.TOGGLE_BROWSER_CHECKBOX,
                    payload: {suiteBrowserId: 'b1', checkStatus: Number(!checkStatus)}
                });

                assert.equal(newState.tree.suites.stateById.s1.checkStatus, INDETERMINATE);
                assert.equal(newState.tree.suites.stateById.s0.checkStatus, INDETERMINATE);
            });
        });
    });

    describe(`${actionNames.TOGGLE_SUITE_CHECKBOX} action`, () => {
        [CHECKED, UNCHECKED].forEach(checkStatus => {
            it(`should set suite checkbox to ${checkStatus ? '' : 'un'}checked state`, () => {
                const suitesById = mkSuite({id: 's1', browserIds: ['b1']});
                const browsersById = mkBrowser({id: 'b1', parentId: 's1'});
                const suitesStateById = {s1: {shouldBeShown: true, checkStatus: Number(!checkStatus)}};
                const browsersStateById = {b1: {shouldBeShown: true, checkStatus: Number(!checkStatus)}};
                const tree = mkStateTree({suitesById, suitesStateById, browsersById, browsersStateById});
                const view = mkStateView({keyToGroupTestsBy: ''});

                const newState = reducer({tree, view}, {
                    type: actionNames.TOGGLE_SUITE_CHECKBOX,
                    payload: {suiteId: 's1', checkStatus}
                });

                assert.equal(newState.tree.suites.stateById.s1.checkStatus, checkStatus);
            });

            it(`should not change ${checkStatus ? '' : 'un'}checked state`, () => {
                const suitesById = mkSuite({id: 's1', browserIds: ['b1']});
                const browsersById = mkBrowser({id: 'b1', parentId: 's1'});
                const suitesStateById = {s1: {shouldBeShown: true, checkStatus}};
                const browsersStateById = {b1: {shouldBeShown: true, checkStatus}};
                const tree = mkStateTree({suitesById, suitesStateById, browsersById, browsersStateById});
                const view = mkStateView({keyToGroupTestsBy: ''});

                const newState = reducer({tree, view}, {
                    type: actionNames.TOGGLE_SUITE_CHECKBOX,
                    payload: {suiteId: 's1', checkStatus}
                });

                assert.equal(newState.tree.suites.stateById.s1.checkStatus, checkStatus);
                assert.equal(newState.tree.browsers.stateById.b1.checkStatus, checkStatus);
            });

            it(`should set child browser checkbox to ${checkStatus ? '' : 'un'}checked state`, () => {
                const suitesById = mkSuite({id: 's1', browserIds: ['b1']});
                const browsersById = mkBrowser({id: 'b1', parentId: 's1'});
                const suitesStateById = {s1: {shouldBeShown: true, checkStatus: Number(!checkStatus)}};
                const browsersStateById = {b1: {shouldBeShown: true, checkStatus: Number(!checkStatus)}};
                const tree = mkStateTree({suitesById, suitesStateById, browsersById, browsersStateById});
                const view = mkStateView({keyToGroupTestsBy: ''});

                const newState = reducer({tree, view}, {
                    type: actionNames.TOGGLE_SUITE_CHECKBOX,
                    payload: {suiteId: 's1', checkStatus}
                });

                assert.equal(newState.tree.browsers.stateById.b1.checkStatus, checkStatus);
            });

            it(`should set child suite checkbox to ${checkStatus ? '' : 'un'}checked state`, () => {
                const suitesById = {
                    ...mkSuite({id: 's0', suiteIds: ['s1']}),
                    ...mkSuite({id: 's1', browserIds: ['b1'], parentId: 's0'})
                };
                const browsersById = mkBrowser({id: 'b1', parentId: 's1'});
                const suitesStateById = {
                    s0: {shouldBeShown: true, checkStatus: Number(!checkStatus)},
                    s1: {shouldBeShown: true, checkStatus: Number(!checkStatus)}
                };
                const browsersStateById = {b1: {shouldBeShown: true, checkStatus: Number(!checkStatus)}};
                const tree = mkStateTree({suitesById, suitesStateById, browsersById, browsersStateById});
                const view = mkStateView({keyToGroupTestsBy: ''});

                const newState = reducer({tree, view}, {
                    type: actionNames.TOGGLE_SUITE_CHECKBOX,
                    payload: {suiteId: 's0', checkStatus}
                });

                assert.equal(newState.tree.suites.stateById.s1.checkStatus, checkStatus);
            });

            it(`should update parents to ${checkStatus ? '' : 'un'}checked state`, () => {
                const suitesById = {
                    ...mkSuite({id: 's0', suiteIds: ['s1']}),
                    ...mkSuite({id: 's1', suiteIds: ['s2'], parentId: 's0'}),
                    ...mkSuite({id: 's2', browserIds: ['b1'], parentId: 's1'})
                };
                const browsersById = mkBrowser({id: 'b1', parentId: 's2'});
                const suitesStateById = {
                    s0: {shouldBeShown: true, checkStatus: Number(!checkStatus)},
                    s1: {shouldBeShown: true, checkStatus: Number(!checkStatus)},
                    s2: {shouldBeShown: true, checkStatus: Number(!checkStatus)}
                };
                const browsersStateById = {b1: {shouldBeShown: true, checkStatus: Number(!checkStatus)}};
                const tree = mkStateTree({suitesById, suitesStateById, browsersById, browsersStateById});
                const view = mkStateView({keyToGroupTestsBy: ''});

                const newState = reducer({tree, view}, {
                    type: actionNames.TOGGLE_SUITE_CHECKBOX,
                    payload: {suiteId: 's2', checkStatus}
                });

                assert.equal(newState.tree.suites.stateById.s1.checkStatus, checkStatus);
                assert.equal(newState.tree.suites.stateById.s0.checkStatus, checkStatus);
            });

            it(`should update parents to indeterminate from ${checkStatus ? '' : 'un'}checked state`, () => {
                const suitesById = {
                    ...mkSuite({id: 's0', suiteIds: ['s1']}),
                    ...mkSuite({id: 's1', suiteIds: ['s2', 's3'], parentId: 's0'}),
                    ...mkSuite({id: 's2', browserIds: ['b1'], parentId: 's1'}),
                    ...mkSuite({id: 's3', browserIds: ['b2'], parentId: 's1'})
                };
                const browsersById = {
                    ...mkBrowser({id: 'b1', parentId: 's2'}),
                    ...mkBrowser({id: 'b2', parentId: 's3'})
                };
                const suitesStateById = {
                    s0: {shouldBeShown: true, checkStatus},
                    s1: {shouldBeShown: true, checkStatus},
                    s2: {shouldBeShown: true, checkStatus},
                    s3: {shouldBeShown: true, checkStatus}
                };
                const browsersStateById = {
                    b1: {shouldBeShown: true, checkStatus},
                    b2: {shouldBeShown: true, checkStatus}
                };
                const tree = mkStateTree({suitesById, suitesStateById, browsersById, browsersStateById});
                const view = mkStateView({keyToGroupTestsBy: ''});

                const newState = reducer({tree, view}, {
                    type: actionNames.TOGGLE_SUITE_CHECKBOX,
                    payload: {suiteId: 's2', checkStatus: Number(!checkStatus)}
                });

                assert.equal(newState.tree.suites.stateById.s1.checkStatus, INDETERMINATE);
                assert.equal(newState.tree.suites.stateById.s0.checkStatus, INDETERMINATE);
            });
        });
    });

    describe(`${actionNames.TOGGLE_GROUP_CHECKBOX} action`, () => {
        const mkState = ({checkStatus}) => {
            const suitesById = mkSuite({id: 's1', browserIds: ['b1']});
            const browsersById = mkBrowser({id: 'b1', parentId: 's1'});
            const suitesStateById = {s1: {shouldBeShown: true, checkStatus}};
            const browsersStateById = {b1: {shouldBeShown: true, checkStatus}};
            const tree = mkStateTree({suitesById, suitesStateById, browsersById, browsersStateById});
            const view = mkStateView({keyToGroupTestsBy: ''});

            return {tree, view};
        };

        [CHECKED, UNCHECKED].forEach(checkStatus => {
            it(`should not change ${checkStatus ? '' : 'un'}checked state`, () => {
                const state = mkState({checkStatus});

                const newState = reducer(state, {
                    type: actionNames.TOGGLE_GROUP_CHECKBOX,
                    payload: {browserIds: ['b1'], checkStatus}
                });

                assert.equal(newState.tree.browsers.stateById.b1.checkStatus, checkStatus);
            });

            it(`should set browsers checkbox to ${checkStatus ? '' : 'un'}checked state`, () => {
                const state = mkState({checkStatus: Number(!checkStatus)});

                const newState = reducer(state, {
                    type: actionNames.TOGGLE_GROUP_CHECKBOX,
                    payload: {browserIds: ['b1'], checkStatus}
                });

                assert.equal(newState.tree.browsers.stateById.b1.checkStatus, checkStatus);
            });

            it(`should set child suite checkbox to ${checkStatus ? '' : 'un'}checked state`, () => {
                const state = mkState({checkStatus: Number(!checkStatus)});

                const newState = reducer(state, {
                    type: actionNames.TOGGLE_GROUP_CHECKBOX,
                    payload: {browserIds: ['b1'], checkStatus}
                });

                assert.equal(newState.tree.suites.stateById.s1.checkStatus, checkStatus);
            });
        });
    });

    [
        actionNames.BROWSERS_SELECTED,
        actionNames.CHANGE_VIEW_MODE,
        actionNames.VIEW_UPDATE_FILTER_BY_NAME,
        actionNames.VIEW_SET_STRICT_MATCH_FILTER
    ].forEach(actionName => {
        describe(`${actionName} action`, () => {
            const mkActionStateView = ({viewMode, testNameFilter, strictMatchFilter, filteredBrowsers}) => {
                const actionToMkView = {
                    [actionNames.CHANGE_VIEW_MODE]: () => mkStateView({viewMode}),
                    [actionNames.VIEW_UPDATE_FILTER_BY_NAME]: () => mkStateView({testNameFilter}),
                    [actionNames.VIEW_SET_STRICT_MATCH_FILTER]: () => mkStateView({testNameFilter, strictMatchFilter}),
                    [actionNames.BROWSERS_SELECTED]: () => mkStateView({filteredBrowsers})
                };

                return actionToMkView[actionName]();
            };

            it('should uncheck unshown tests', () => {
                const browsersById = {
                    ...mkBrowser({id: 'b1', name: 'b1', resultIds: ['r1'], parentId: 's1'}),
                    ...mkBrowser({id: 'b2', name: 'b2', resultIds: ['r2'], parentId: 's1'})
                };
                const resultsById = {
                    ...mkResult({id: 'r1', status: SUCCESS}),
                    ...mkResult({id: 'r2', status: SUCCESS})
                };
                const browsersStateById = {
                    b1: {checkStatus: CHECKED, shouldBeShown: true},
                    d1: {checkStatus: CHECKED, shouldBeShown: true}
                };
                const suitesById = mkSuite({id: 's1', browserIds: ['b1', 'b2'], parentId: null, root: true});
                const suitesStateById = {'s1': {checkStatus: CHECKED, shouldBeShown: true, shouldBeOpened: true}};
                const suitesAllRootIds = ['s1'];
                const tree = mkStateTree({suitesById, browsersById, resultsById, suitesStateById, browsersStateById, suitesAllRootIds});
                const view = mkActionStateView({
                    viewMode: ViewMode.FAILED,
                    testNameFilter: 'suite-2',
                    strictMatchFilter: true,
                    filteredBrowsers: [{id: 'c1', versions: []}]
                });

                const newState = reducer({tree, view}, {type: actionName});

                assert.equal(newState.tree.browsers.stateById.b1.checkStatus, UNCHECKED);
                assert.equal(newState.tree.browsers.stateById.b2.checkStatus, UNCHECKED);
            });

            it('should save check on shown tests', () => {
                const browsersById = mkBrowser({id: 'b1', name: 'b1', resultIds: ['r1'], parentId: 's1'});
                const resultsById = mkResult({id: 'r1', status: FAIL});
                const browsersStateById = {b1: {checkStatus: CHECKED, shouldBeShown: true}};
                const suitesById = mkSuite({id: 's1', browserIds: ['b1'], parentId: null, root: true});
                const suitesStateById = {s1: {checkStatus: CHECKED, shouldBeShown: true, shouldBeOpened: true}};
                const suitesAllRootIds = ['s1'];
                const tree = mkStateTree({suitesById, browsersById, resultsById, suitesStateById, browsersStateById, suitesAllRootIds});
                const view = mkActionStateView({
                    viewMode: ViewMode.FAILED,
                    testNameFilter: 's1',
                    strictMatchFilter: true,
                    filteredBrowsers: [{id: 'b1', versions: []}]
                });

                const newState = reducer({tree, view}, {type: actionName});

                assert.equal(newState.tree.browsers.stateById.b1.checkStatus, CHECKED);
            });

            it('should update parent suite', () => {
                const browsersById = {
                    ...mkBrowser({id: 'b1', name: 'b1', resultIds: ['r1'], parentId: 's1'}),
                    ...mkBrowser({id: 'd1', name: 'd1', resultIds: ['r2'], parentId: 's2'})
                };
                const resultsById = {
                    ...mkResult({id: 'r1', status: FAIL}),
                    ...mkResult({id: 'r2', status: SUCCESS})
                };
                const browsersStateById = {
                    b1: {checkStatus: CHECKED, shouldBeShown: true},
                    d1: {checkStatus: UNCHECKED, shouldBeShown: true}
                };
                const suitesById = {
                    ...mkSuite({id: 's0', suiteIds: ['s1', 's2'], parentId: null, root: true}),
                    ...mkSuite({id: 's1', browserIds: ['b1'], parentId: 's0'}),
                    ...mkSuite({id: 's2', browserIds: ['d1'], parentId: 's0'})
                };
                const suitesStateById = {
                    s0: {checkStatus: INDETERMINATE, shouldBeShown: true, shouldBeOpened: true},
                    s1: {checkStatus: CHECKED, shouldBeShown: true, shouldBeOpened: true},
                    s2: {checkStatus: UNCHECKED, shouldBeShown: false, shouldBeOpened: false}
                };
                const suitesAllRootIds = ['s1'];
                const tree = mkStateTree({suitesById, browsersById, resultsById, suitesStateById, browsersStateById, suitesAllRootIds});
                const view = mkActionStateView({
                    viewMode: ViewMode.FAILED,
                    testNameFilter: 'brow1',
                    strictMatchFilter: true,
                    filteredBrowsers: [{id: 'b1', versions: []}]
                });

                const newState = reducer({tree, view}, {type: actionName});

                assert.equal(newState.tree.suites.stateById.s0.checkStatus, CHECKED);
                assert.equal(newState.tree.suites.stateById.s1.checkStatus, CHECKED);
            });
        });
    });

    describe('static accepter', () => {
        let state;

        beforeEach(() => {
            const imagesById = {
                ...mkImage({id: 'i0', status: FAIL, parentId: 'r0', stateName: 'foo'}),
                ...mkImage({id: 'i1', status: FAIL, parentId: 'r1', stateName: 'foo'}),
                ...mkImage({id: 'i2', status: FAIL, parentId: 'r1', stateName: 'bar'}),
                ...mkImage({id: 'i3', status: FAIL, parentId: 'r2', stateName: 'baz'})
            };
            const browsersById = {
                ...mkBrowser({id: 'b1', name: 'b1', resultIds: ['r0', 'r1'], parentId: 's1'}),
                ...mkBrowser({id: 'd1', name: 'd1', resultIds: ['r2'], parentId: 's2'})
            };
            const resultsById = {
                ...mkResult({id: 'r0', status: FAIL, error: {name: ErrorName.ASSERT_VIEW}, parentId: 'b1', imageIds: ['i0']}),
                ...mkResult({id: 'r1', status: FAIL, error: {name: ErrorName.ASSERT_VIEW}, parentId: 'b1', imageIds: ['i1', 'i2']}),
                ...mkResult({id: 'r2', status: FAIL, error: {name: ErrorName.ASSERT_VIEW}, parentId: 'd1', imageIds: ['i3']})
            };
            const browsersStateById = {
                b1: {checkStatus: CHECKED, shouldBeShown: true},
                d1: {checkStatus: UNCHECKED, shouldBeShown: true}
            };
            const suitesById = {
                ...mkSuite({id: 's0', status: FAIL, suiteIds: ['s1', 's2'], parentId: null, root: true}),
                ...mkSuite({id: 's1', status: FAIL, browserIds: ['b1'], parentId: 's0'}),
                ...mkSuite({id: 's2', status: FAIL, browserIds: ['d1'], parentId: 's0'})
            };
            const suitesStateById = {
                's0': {shouldBeShown: true},
                's1': {shouldBeShown: true},
                's2': {shouldBeShown: true}
            };
            const suitesAllRootIds = ['s1'];
            const tree = mkStateTree({suitesById, browsersById, resultsById, imagesById, browsersStateById, suitesAllRootIds, suitesStateById});
            const view = mkStateView({
                viewMode: ViewMode.FAILED,
                testNameFilter: '',
                strictMatchFilter: false,
                filteredBrowsers: [{id: 'b1', versions: []}, {id: 'd1', versions: []}]
            });
            const staticImageAccepter = {acceptableImages: {
                'i0': {id: 'i0', originalStatus: FAIL, stateNameImageId: 's0 s1 b1 foo'},
                'i1': {id: 'i1', originalStatus: FAIL, stateNameImageId: 's0 s1 b1 foo'},
                'i2': {id: 'i2', originalStatus: FAIL, stateNameImageId: 's0 s1 b1 bar'},
                'i3': {id: 'i3', originalStatus: FAIL, stateNameImageId: 's0 s2 d1 baz'}
            }};

            state = {tree, view, staticImageAccepter};
        });

        [
            {actionName: actionNames.STATIC_ACCEPTER_STAGE_SCREENSHOT, newStatus: STAGED},
            {actionName: actionNames.STATIC_ACCEPTER_COMMIT_SCREENSHOT, newStatus: COMMITED}
        ].forEach(({actionName, newStatus}) => {
            describe(`${actionName} action`, () => {
                it('should change image status', () => {
                    const newState = reducer(state, {type: actionName, payload: ['i1']});

                    assert.equal(newState.tree.images.byId['i1'].status, newStatus);
                });

                it('should not change result status', () => {
                    const newState = reducer(state, {type: actionName, payload: ['i1']});

                    assert.equal(newState.tree.results.byId['r1'].status, FAIL);
                });

                it('should change result status', () => {
                    const newState = reducer(state, {type: actionName, payload: ['i1', 'i2']});

                    assert.equal(newState.tree.results.byId['r1'].status, newStatus);
                });

                it('should not change suite status', () => {
                    const newState = reducer(state, {type: actionName, payload: ['i1', 'i2']});

                    assert.equal(newState.tree.suites.byId['s2'].status, FAIL);
                });

                it('should change suite status', () => {
                    const newState = reducer(state, {type: actionName, payload: ['i1', 'i2', 'i3']});

                    assert.equal(newState.tree.suites.byId['s2'].status, newStatus);
                });

                it('should change suite state', () => {
                    const newState = reducer(state, {type: actionName, payload: ['i1', 'i2', 'i3']});

                    assert.equal(newState.tree.suites.stateById['s2'].shouldBeShown, false);
                });
            });
        });

        describe(`${actionNames.STATIC_ACCEPTER_STAGE_SCREENSHOT} action`, () => {
            it('should unstage another staged image', () => {
                const newState = reducer(state, {type: actionNames.STATIC_ACCEPTER_STAGE_SCREENSHOT, payload: ['i0']});

                assert.equal(newState.tree.images.byId['i0'].status, STAGED);

                const nextState = reducer(newState, {type: actionNames.STATIC_ACCEPTER_STAGE_SCREENSHOT, payload: ['i1']});

                assert.equal(nextState.tree.images.byId['i0'].status, FAIL);
            });
        });

        describe(`${actionNames.STATIC_ACCEPTER_UNSTAGE_SCREENSHOT} action`, () => {
            it('should return original image status', () => {
                const newState = reducer(state, {type: actionNames.STATIC_ACCEPTER_STAGE_SCREENSHOT, payload: ['i1']});

                const nextState = reducer(newState, {type: actionNames.STATIC_ACCEPTER_UNSTAGE_SCREENSHOT, payload: ['i1']});

                assert.equal(nextState.tree.images.byId['i1'].status, FAIL);
            });

            it('should return original result status', () => {
                const firstState = reducer(state, {type: actionNames.STATIC_ACCEPTER_STAGE_SCREENSHOT, payload: ['i1', 'i2']});

                const secondState = reducer(firstState, {type: actionNames.STATIC_ACCEPTER_UNSTAGE_SCREENSHOT, payload: ['i1']});
                const thirdState = reducer(secondState, {type: actionNames.STATIC_ACCEPTER_UNSTAGE_SCREENSHOT, payload: ['i2']});

                assert.equal(thirdState.tree.results.byId['r1'].status, FAIL);
            });

            it('should return original suite status', () => {
                const firstState = reducer(state, {type: actionNames.STATIC_ACCEPTER_STAGE_SCREENSHOT, payload: ['i1', 'i2', 'i3']});

                const secondState = reducer(firstState, {type: actionNames.STATIC_ACCEPTER_UNSTAGE_SCREENSHOT, payload: ['i1']});
                const thirdState = reducer(secondState, {type: actionNames.STATIC_ACCEPTER_UNSTAGE_SCREENSHOT, payload: ['i2']});
                const fourthState = reducer(thirdState, {type: actionNames.STATIC_ACCEPTER_UNSTAGE_SCREENSHOT, payload: ['i3']});

                assert.equal(fourthState.tree.suites.byId['s1'].status, FAIL);
            });

            it('should fail parent suites', () => {
                state.tree.suites.byId['s0'].status = SUCCESS;
                state.tree.suites.byId['s1'].status = SUCCESS;
                state.tree.results.byId['r1'].status = STAGED;
                state.tree.images.byId['i1'].status = STAGED;

                const nextState = reducer(state, {type: actionNames.STATIC_ACCEPTER_UNSTAGE_SCREENSHOT, payload: ['i1']});

                assert.equal(nextState.tree.suites.byId['s0'].status, FAIL);
                assert.equal(nextState.tree.suites.byId['s1'].status, FAIL);
            });
        });
    });
});
