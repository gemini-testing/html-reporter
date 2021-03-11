import {SUCCESS, FAIL, ERROR} from 'lib/constants/test-statuses';
import reducer from 'lib/static/modules/reducers/tree';
import actionNames from 'lib/static/modules/action-names';
import {mkSuite, mkBrowser, mkResult, mkStateTree, mkStateView} from '../../state-utils';

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

            const newState = reducer({tree}, {
                type: actionNames.BROWSERS_SELECTED,
                payload: {browsers: [{id: 'yabro', versions: []}]}
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

            const newState = reducer({tree}, {
                type: actionNames.BROWSERS_SELECTED,
                payload: {browsers: [{id: 'yabro-1', versions: []}]}
            });

            assert.equal(newState.tree.suites.byId.s1.status, FAIL);
            assert.equal(newState.tree.suites.byId.s2.status, SUCCESS);
        });
    });
});
