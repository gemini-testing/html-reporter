import reducer from 'lib/static/modules/reducers/tree';
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
});
