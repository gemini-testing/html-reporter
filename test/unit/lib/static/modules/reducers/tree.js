import reducer, {getChildSuitesStatus} from 'lib/static/modules/reducers/tree';
import actionNames from 'lib/static/modules/action-names';
import {SUCCESS} from 'lib/constants/test-statuses';

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

    describe('function', () => {
        describe('getChildSuitesStatus', () => {
            it('should return `error` for combined test that has both success suites and failed browsers', () => {
                const tree = {
                    'suites': {
                        'byId': {
                            'suite': {
                                'id': 'suite',
                                'parentId': null,
                                'name': 'suite',
                                'suitePath': ['suite'],
                                'root': true,
                                'suiteIds': ['suite combined'],
                                'status': 'error'
                            },
                            'suite combined': {
                                'id': 'suite combined',
                                'parentId': 'suite',
                                'name': 'combined',
                                'suitePath': ['suite', 'combined'],
                                'root': false,
                                'suiteIds': ['suite combined test'],
                                'status': 'success',
                                'browserIds': ['suite combined chrome']
                            },
                            'suite combined test': {
                                'id': 'suite combined test',
                                'parentId': 'suite combined',
                                'name': 'test',
                                'suitePath': ['suite', 'combined', 'test'],
                                'root': false,
                                'browserIds': ['suite combined test chrome'],
                                'status': 'success'
                            }
                        },
                        'allIds': ['suite', 'suite combined', 'suite combined test'],
                        'allRootIds': ['suite'],
                        'failedRootIds': ['suite']
                    },
                    'browsers': {
                        'byId': {
                            'suite combined test chrome': {
                                'id': 'suite combined test chrome',
                                'parentId': 'suite combined test',
                                'name': 'chrome',
                                'resultIds': ['suite combined test chrome 0'],
                                'version': 'unknown'
                            },
                            'suite combined chrome': {
                                'id': 'suite combined chrome',
                                'parentId': 'suite combined',
                                'name': 'chrome',
                                'resultIds': ['suite combined chrome 0'],
                                'version': 'unknown'
                            }
                        },
                        'allIds': ['suite combined test chrome', 'suite combined chrome'],
                        'stateById': {}
                    },
                    'results': {
                        'byId': {
                            'suite path test chrome-desktop 0': {
                                'id': 'suite path test chrome-desktop 0',
                                'parentId': 'suite path test chrome-desktop',
                                'name': 'chrome-desktop',
                                'status': 'fail'
                            },
                            'suite combined test chrome 0': {
                                'id': 'suite combined test chrome 0',
                                'parentId': 'suite combined test chrome',
                                'name': 'chrome',
                                'status': 'success'
                            },
                            'suite combined chrome 0': {
                                'id': 'suite combined chrome 0',
                                'parentId': 'suite combined chrome',
                                'name': 'chrome',
                                'status': 'error'
                            }
                        },
                        'allIds': ['suite combined test chrome 0', 'suite combined chrome 0']
                    }
                };

                const combinedSuiteName = tree.suites.allIds[1]; // 'suite combined'
                const combinedBrowserName = `${combinedSuiteName} chrome`;
                const filteredBrowsers = [{
                    id: tree.browsers.byId[combinedBrowserName].name,
                    versions: [tree.browsers.byId[combinedBrowserName].version]
                }];
                const getStatus = (suite) => getChildSuitesStatus({tree}, suite, filteredBrowsers);

                assert.equal(getStatus(tree.suites.byId[combinedSuiteName]), 'error');
            });
        });
    });
});
