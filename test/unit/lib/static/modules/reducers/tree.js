import reducer from 'lib/static/modules/reducers/tree';
import actionNames from 'lib/static/modules/action-names';
import {ERROR, SUCCESS} from 'lib/constants/test-statuses';
import {mkSuite, mkBrowser, mkResult, mkStateTree} from 'test/unit/utils-tree';

describe('lib/static/modules/reducers/tree', () => {
    describe(`${actionNames.BROWSERS_SELECTED} action`, () => {
        it('should update statuses of suites', () => {
            const state = {tree: {
                'suites': {
                    'byId': {
                        'suite': {
                            'id': 'suite',
                            'parentId': null,
                            'name': 'suite',
                            'root': true,
                            'suiteIds': [
                                'suite path'
                            ],
                            'status': 'fail'
                        },
                        'suite path': {
                            'id': 'suite path',
                            'parentId': 'suite',
                            'name': 'path',
                            'root': false,
                            'suiteIds': [
                                'suite path test'
                            ],
                            'status': 'fail'
                        },
                        'suite path test': {
                            'id': 'suite path test',
                            'parentId': 'suite path',
                            'name': 'test',
                            'root': false,
                            'browserIds': [
                                'suite path test chrome-desktop',
                                'suite path test chrome-desktop-2'
                            ],
                            'status': 'fail'
                        }
                    },
                    'allIds': [
                        'suite',
                        'suite path',
                        'suite path test'
                    ],
                    'allRootIds': [
                        'suite'
                    ],
                    'failedRootIds': [
                        'suite'
                    ]
                },
                'browsers': {
                    'byId': {
                        'suite path test chrome-desktop': {
                            'id': 'suite path test chrome-desktop',
                            'parentId': 'suite path test',
                            'name': 'chrome-desktop',
                            'resultIds': [
                                'suite path test chrome-desktop 0'
                            ],
                            'version': '72.0'
                        },
                        'suite path test chrome-desktop-2': {
                            'id': 'suite path test chrome-desktop-2',
                            'parentId': 'suite path test',
                            'name': 'chrome-desktop-2',
                            'resultIds': [
                                'suite path test chrome-desktop-2 0'
                            ],
                            'version': '72.0'
                        }
                    },
                    'allIds': [
                        'suite path test chrome-desktop',
                        'suite path test chrome-desktop-2'
                    ]
                },
                'results': {
                    'byId': {
                        'suite path test chrome-desktop 0': {
                            'id': 'suite path test chrome-desktop 0',
                            'parentId': 'suite path test chrome-desktop',
                            'name': 'chrome-desktop',
                            'status': 'fail'
                        },
                        'suite path test chrome-desktop-2 0': {
                            'id': 'suite path test chrome-desktop-2 0',
                            'parentId': 'suite path test chrome-desktop-2',
                            'name': 'chrome-desktop-2',
                            'status': 'success'
                        }
                    },
                    'allIds': [
                        'suite path test chrome-desktop 0',
                        'suite path test chrome-desktop-2 0'
                    ]
                }
            }};

            const newState = reducer(state, {
                type: actionNames.BROWSERS_SELECTED,
                payload: {browsers: [{id: 'chrome-desktop-2', versions: []}]}
            });

            assert.equal(newState.tree.suites.byId.suite.status, SUCCESS);
        });
    });

    describe('function getChildSuitesStatus', () => {
        it('should return `error` for combined test that has both success suites and failed browsers', () => {
            const suiteRoot = 'suite';
            const suite1 = 'suite combined';
            const suite2 = 'suite combined test';

            const browser1 = `${suite1} bro`;
            const browser2 = `${suite2} bro`;

            const result1 = `${browser1} 0`;
            const result2 = `${browser2} 0`;

            const suitesById = {
                ...mkSuite({id: suiteRoot, root: true, suiteIds: [suite1]}),
                // ключевой сьют, который содержит и suiteIds (success), и browserIds (failed)
                ...mkSuite({id: suite1, parentId: suiteRoot, suiteIds: [suite2], browserIds: [browser1]}),
                ...mkSuite({id: suite2, parentId: suite1, browserIds: [browser2]})
            };

            const browsersById = {
                ...mkBrowser({id: browser1, parentId: suite1, resultIds: [result1]}),
                ...mkBrowser({id: browser2, parentId: suite2, resultIds: [result2]})
            };
            const resultsById = {
                ...mkResult({id: result1, parentId: browser1, status: ERROR}),
                ...mkResult({id: result2, parentId: browser2, status: SUCCESS})
            };
            const filteredBrowsers = [{id: 'default-bro', versions: ['default-ver']}];

            const tree = mkStateTree({suitesById, browsersById, resultsById});

            const updatedState = reducer({tree, view: {filteredBrowsers}}, {
                type: actionNames.INIT_STATIC_REPORT,
                payload: {tree}
            });
            assert.equal(updatedState.tree.suites.byId[suiteRoot].status, ERROR);
            assert.equal(updatedState.tree.suites.byId[suite1].status, ERROR);
        });
    });
});
