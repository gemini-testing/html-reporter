'use strict';

const {getSuitesTreeViewData} = require('lib/static/new-ui/features/suites/components/SuitesPage/selectors');
const {SortDirection, SortType, TreeViewMode} = require('lib/static/new-ui/types/store');
const {SUCCESS} = require('lib/constants/test-statuses');

describe('SuitesPage selectors', () => {
    it('should preserve tree nodes outside of patched roots', () => {
        const makeSuite = id => ({id, hash: `hash-${id}`, name: id, parentId: null, status: SUCCESS, browserIds: [`browser-${id}`], suitePath: [id]});
        const makeBrowser = id => ({id: `browser-${id}`, name: 'chrome', parentId: id, resultIds: [`result-${id}`]});
        const makeResult = id => ({id: `result-${id}`, parentId: `browser-${id}`, attempt: 0, imageIds: [], status: SUCCESS, timestamp: 0, metaInfo: {}, suitePath: [id]});
        const suites = {first: makeSuite('first'), second: makeSuite('second')};
        const browsers = {['browser-first']: makeBrowser('first'), ['browser-second']: makeBrowser('second')};
        const results = {['result-first']: makeResult('first'), ['result-second']: makeResult('second')};
        const browserState = {shouldBeShown: true, retryIndex: 0};
        const state = {
            tree: {
                groups: {byId: {}, allRootIds: []},
                suites: {byId: suites},
                browsers: {byId: browsers, stateById: {['browser-first']: browserState, ['browser-second']: browserState}},
                results: {byId: results},
                images: {byId: {}}
            },
            ui: {suitesPage: {treeViewMode: TreeViewMode.Tree}},
            app: {
                sortTestsData: {
                    currentDirection: SortDirection.Asc,
                    currentExpressionIds: ['by-name'],
                    availableExpressions: [{id: 'by-name', label: 'Name', type: SortType.ByName}]
                }
            },
            browsers: [{id: 'chrome', versions: []}]
        };
        const initialTreeData = getSuitesTreeViewData(state);
        const firstRootNode = initialTreeData.tree.find(node => node.data.entityId === 'first');
        const updatedSecond = {...suites.second, browserIds: ['browser-second', 'browser-third']};
        const thirdBrowser = makeBrowser('third');
        thirdBrowser.parentId = 'second';
        thirdBrowser.name = 'firefox';
        const nextState = {
            ...state,
            tree: {
                ...state.tree,
                lastPatch: {
                    affectedRootIds: ['second'],
                    affectedSuiteIds: ['second'],
                    suites: {addedIds: [], removedIds: [], byId: {second: updatedSecond}, allRootIds: ['first', 'second']},
                    browsers: {addedIds: ['browser-third'], removedIds: [], byId: {['browser-third']: thirdBrowser}},
                    results: {addedIds: ['result-third'], removedIds: [], byId: {['result-third']: makeResult('third')}},
                    images: {addedIds: [], removedIds: [], byId: {}}
                },
                suites: {...state.tree.suites, byId: {...suites, second: updatedSecond}},
                browsers: {
                    byId: {...browsers, ['browser-third']: thirdBrowser},
                    stateById: {...state.tree.browsers.stateById, ['browser-third']: browserState}
                },
                results: {byId: {...results, ['result-third']: makeResult('third')}}
            }
        };

        const updatedTreeData = getSuitesTreeViewData(nextState);

        assert.strictEqual(updatedTreeData.tree.find(node => node.data.entityId === 'first'), firstRootNode);
        assert.lengthOf(updatedTreeData.tree.find(node => node.data.entityId === 'second').children, 2);
    });
});
