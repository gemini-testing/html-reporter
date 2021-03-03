import reducer from 'lib/static/modules/reducers/tree';
import actionNames from 'lib/static/modules/action-names';
import {ERROR, SUCCESS} from 'lib/constants/test-statuses';
import {defaults} from 'lodash';

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
            const mkSuite = (opts) => {
                const result = defaults(opts, {
                    id: 'default-suite-id',
                    parentId: null,
                    name: 'default-name',
                    root: false
                });

                return {[result.id]: result};
            };

            const mkBrowser = (opts) => {
                const browser = defaults(opts, {
                    id: 'default-bro-id',
                    name: 'default-bro',
                    parentId: 'default-test-id',
                    resultIds: [],
                    version: 'default-ver'
                });

                return {[browser.id]: browser};
            };

            const mkResult = (opts) => {
                const result = defaults(opts, {
                    id: 'default-result-id',
                    parentId: 'default-bro-id',
                    status: SUCCESS
                });

                return {[result.id]: result};
            };

            const mkStateTree = ({suitesById = {}, browsersById = {}, resultsById = {}, imagesById = {}} = {}) => {
                return {
                    suites: {
                        byId: suitesById,
                        allRootIds: Object.values(suitesById).filter(({root}) => root).map(({id}) => id),
                        allIds: Object.keys(suitesById)
                    },
                    browsers: {
                        byId: browsersById,
                        allIds: Object.keys(browsersById)
                    },
                    results: {byId: resultsById},
                    images: {byId: imagesById}
                };
            };

            const suitesById = {
                ...mkSuite({id: 'suite', root: true, name: 'suite', suiteIds: ['suite combined']}),
                ...mkSuite({
                    id: 'suite combined',
                    name: 'combined',
                    parentId: 'suite',
                    suiteIds: ['suite combined test'],
                    browserIds: ['suite combined bro']
                }),
                ...mkSuite({
                    id: 'suite combined test',
                    name: 'test',
                    parentId: 'suite combined',
                    browserIds: ['suite combined test bro']
                })
            };
            const browsersById = {
                ...mkBrowser({
                    id: 'suite combined bro',
                    parentId: 'suite combined',
                    resultIds: ['suite combined bro 0']
                }),
                ...mkBrowser({
                    id: 'suite combined test bro',
                    parentId: 'suite combined test',
                    resultIds: ['suite combined test bro 0']
                })
            };
            const resultsById = {
                ...mkResult({
                    id: 'suite combined test bro 0',
                    parentId: 'suite combined test bro',
                    status: SUCCESS
                }),
                ...mkResult({
                    id: 'suite combined bro 0',
                    parentId: 'suite combined bro',
                    status: ERROR
                })
            };
            const filteredBrowsers = [{
                id: 'default-bro',
                versions: ['default-ver']
            }];

            const tree = mkStateTree({suitesById, browsersById, resultsById});

            const updatedState = reducer({tree, view: {filteredBrowsers}}, {
                type: actionNames.INIT_STATIC_REPORT,
                payload: {tree}
            });
            assert.equal(updatedState.tree.suites.byId['suite'].status, ERROR);
            assert.equal(updatedState.tree.suites.byId['suite combined'].status, ERROR);
        });
    });
});
