import {SUCCESS, FAIL, ERROR, UPDATED} from 'lib/constants/test-statuses';
import reducer from 'lib/static/modules/reducers/tree';
import actionNames from 'lib/static/modules/action-names';
import viewModes from 'lib/constants/view-modes';
import {EXPAND_ALL, EXPAND_ERRORS, EXPAND_RETRIES} from 'lib/constants/expand-modes';
import {mkSuite, mkBrowser, mkResult, mkImage, mkStateTree, mkStateView} from '../../../state-utils';

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
                            const state = {view: mkStateView({viewMode: viewModes.FAILED})};

                            const newState = reducer(state, {
                                type: actionName,
                                payload: {tree}
                            });

                            assert.isTrue(newState.tree.suites.stateById.s1.shouldBeShown);
                            assert.isTrue(newState.tree.suites.stateById.s2.shouldBeShown);
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

                            assert.isTrue(newState.tree.suites.stateById.s1.shouldBeShown);
                            assert.isTrue(newState.tree.suites.stateById.s2.shouldBeShown);
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
                            const state = {view: mkStateView({viewMode: viewModes.FAILED})};

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
                            const state = {view: mkStateView({viewMode: viewModes.FAILED})};

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
                            const state = {view: mkStateView({viewMode: viewModes.FAILED})};

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
                            const state = {view: mkStateView({viewMode: viewModes.FAILED})};

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
        });
    });

    [actionNames.TEST_BEGIN, actionNames.TEST_RESULT, actionNames.ACCEPT_OPENED_SCREENSHOTS, actionNames.ACCEPT_SCREENSHOT].forEach((actionName) => {
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
                it('should change "retryIndex" to the last result', () => {
                    const browsersById = {...mkBrowser({id: 'b1', resultIds: ['r1', 'r2']})};
                    const resultsById = {...mkResult({id: 'r1'}), ...mkResult({id: 'r2'})};
                    const browsersStateById = {b1: {retryIndex: 0}};
                    const tree = mkStateTree({browsersById, resultsById, browsersStateById});
                    const view = mkStateView();

                    const newState = reducer({tree, view}, {type: actionName});

                    assert.equal(newState.tree.browsers.stateById.b1.retryIndex, 1);
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
            const tree = mkStateTree({suitesById, browsersById, resultsById});

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
            const tree = mkStateTree({suitesById, browsersById, resultsById});

            const filteredBrowsers = [{id: 'yabro-1', versions: []}];
            const view = mkStateView({filteredBrowsers});

            const newState = reducer({tree, view}, {
                type: actionNames.BROWSERS_SELECTED,
                payload: {browsers: filteredBrowsers}
            });

            assert.equal(newState.tree.suites.byId.s1.status, FAIL);
            assert.equal(newState.tree.suites.byId.s2.status, SUCCESS);
        });
    });
});
