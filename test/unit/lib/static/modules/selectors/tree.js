const {SUCCESS, FAIL, IDLE} = require('lib/constants/test-statuses');
const {getAcceptableImagesByStateName, getAcceptableOpenedImageIds, mkGetLastImageByStateName, areAllRootSuitesIdle, getFailedTests, getFailedSuiteResults} = require('lib/static/modules/selectors/tree');
const {mkSuite, mkBrowser, mkResult, mkImage, mkStateTree, mkStateView} = require('../../state-utils');

describe('tree selectors', () => {
    const mkState = ({tree = mkStateTree(), view = mkStateView()} = {}) => ({tree, view});

    describe('"getAcceptableImagesByStateName" selector', () => {
        it('should return empty object if there are no acceptable images', () => {
            const browsersById = mkBrowser({id: 'b', resultIds: ['r1']});
            const browsersStateById = {b: {shouldBeShown: true}};
            const resultsById = mkResult({id: 'r1', parentId: 'b', imageIds: ['img1']});
            const imagesById = mkImage({id: 'img1', parentId: 'r1', status: SUCCESS});

            const tree = mkStateTree({browsersById, browsersStateById, resultsById, imagesById});
            const state = mkState({tree});

            assert.deepEqual(getAcceptableImagesByStateName(state), {});
        });

        it('should return images grouped by state name', () => {
            const browsersById = mkBrowser({id: 'b', resultIds: ['r1', 'r2']});
            const browsersStateById = {b: {shouldBeShown: true}};
            const resultsById = {
                ...mkResult({id: 'r1', parentId: 'b', imageIds: ['img1']}),
                ...mkResult({id: 'r2', parentId: 'b', imageIds: ['img2']})
            };
            const imagesById = {
                ...mkImage({id: 'img1', parentId: 'r1', stateName: 'first', status: FAIL}),
                ...mkImage({id: 'img2', parentId: 'r2', stateName: 'first', status: FAIL})
            };

            const tree = mkStateTree({browsersById, browsersStateById, resultsById, imagesById});
            const state = mkState({tree});

            assert.deepEqual(
                getAcceptableImagesByStateName(state),
                {'b first': [imagesById['img1'], imagesById['img2']]}
            );
        });

        it('should return images sorted by suite id', () => {
            const browsersById = {
                ...mkBrowser({id: 'b1', parentId: 'suiteB', resultIds: ['r1']}),
                ...mkBrowser({id: 'b2', parentId: 'suiteA', resultIds: ['r2']})
            };
            const browsersStateById = {b1: {shouldBeShown: true}, b2: {shouldBeShown: true}};
            const resultsById = {
                ...mkResult({id: 'r1', parentId: 'b1', imageIds: ['img1']}),
                ...mkResult({id: 'r2', parentId: 'b2', imageIds: ['img2']})
            };
            const imagesById = {
                ...mkImage({id: 'img1', parentId: 'r1', stateName: 'first', status: FAIL}),
                ...mkImage({id: 'img2', parentId: 'r2', stateName: 'second', status: FAIL})
            };

            const tree = mkStateTree({browsersById, browsersStateById, resultsById, imagesById});
            const state = mkState({tree});

            const imagesByStateName = getAcceptableImagesByStateName(state);
            assert.deepEqual(Object.keys(imagesByStateName), ['b2 second', 'b1 first']);
        });

        it('should return images sorted by browser id', () => {
            const browsersById = {
                ...mkBrowser({id: 'b2', name: 'bro2', resultIds: ['r2']}),
                ...mkBrowser({id: 'b1', name: 'bro1', resultIds: ['r1']})
            };
            const browsersStateById = {b1: {shouldBeShown: true}, b2: {shouldBeShown: true}};
            const resultsById = {
                ...mkResult({id: 'r1', parentId: 'b1', imageIds: ['img1']}),
                ...mkResult({id: 'r2', parentId: 'b2', imageIds: ['img2']})
            };
            const imagesById = {
                ...mkImage({id: 'img1', parentId: 'r1', stateName: 'first', status: FAIL}),
                ...mkImage({id: 'img2', parentId: 'r2', stateName: 'second', status: FAIL})
            };

            const tree = mkStateTree({browsersById, browsersStateById, resultsById, imagesById});
            const state = mkState({tree});

            const imagesByStateName = getAcceptableImagesByStateName(state);
            assert.deepEqual(Object.keys(imagesByStateName), ['b1 first', 'b2 second']);
        });

        it('should return images from shown browsers', () => {
            const browsersById = {
                ...mkBrowser({id: 'b1', resultIds: ['r1']}),
                ...mkBrowser({id: 'b2', resultIds: ['r2']}),
                ...mkBrowser({id: 'b3', resultIds: ['r3']})
            };
            const browsersStateById = {
                b1: {shouldBeShown: true},
                b2: {shouldBeShown: false},
                b3: {shouldBeShown: false}
            };
            const resultsById = {
                ...mkResult({id: 'r1', parentId: 'b1', imageIds: ['img1']}),
                ...mkResult({id: 'r2', parentId: 'b2', imageIds: ['img2']}),
                ...mkResult({id: 'r3', parentId: 'b3', imageIds: ['img3']})
            };
            const imagesById = {
                ...mkImage({id: 'img1', parentId: 'r1', stateName: 'first', status: FAIL}),
                ...mkImage({id: 'img2', parentId: 'r2', stateName: 'second', status: FAIL}),
                ...mkImage({id: 'img3', parentId: 'r3', stateName: 'third', status: FAIL})
            };

            const tree = mkStateTree({browsersById, browsersStateById, resultsById, imagesById});
            const state = mkState({tree});

            assert.deepEqual(
                getAcceptableImagesByStateName(state),
                {'b1 first': [imagesById['img1']]}
            );
        });
    });

    describe('"getAcceptableOpenedImageIds" selector', () => {
        describe('should not return images if', () => {
            const _mkStateTree = () => {
                const suitesById = {...mkSuite({id: 's1', browserIds: ['b1']})};
                const suitesStateById = {s1: {shouldBeShown: true, shouldBeOpened: true}};
                const suitesAllRootIds = ['s1'];

                const browsersById = {...mkBrowser({id: 'b1', resultIds: ['r1']})};
                const browsersStateById = {b1: {shouldBeShown: true, shouldBeOpened: true, retryIndex: 0}};

                const resultsById = {...mkResult({id: 'r1', parentId: 'b1', imageIds: ['img1']})};

                const imagesById = {...mkImage({id: 'img1', parentId: 'r1', stateName: 'first', status: FAIL})};
                const imagesStateById = {img1: {shouldBeOpened: true}};

                return mkStateTree({
                    suitesById, suitesStateById, suitesAllRootIds, browsersById, browsersStateById,
                    resultsById, imagesById, imagesStateById
                });
            };

            it('suite is not shown', () => {
                const tree = _mkStateTree();
                tree.suites.stateById['s1'].shouldBeShown = false;

                const state = mkState({tree});

                assert.deepEqual(getAcceptableOpenedImageIds(state), []);
            });

            it('suite is not opened', () => {
                const tree = _mkStateTree();
                tree.suites.stateById['s1'].shouldBeOpened = false;

                const state = mkState({tree});

                assert.deepEqual(getAcceptableOpenedImageIds(state), []);
            });

            it('browser is not shown', () => {
                const tree = _mkStateTree();
                tree.browsers.stateById['b1'].shouldBeShown = false;

                const state = mkState({tree});

                assert.deepEqual(getAcceptableOpenedImageIds(state), []);
            });

            it('browser is not opened', () => {
                const tree = _mkStateTree();
                tree.browsers.stateById['b1'].shouldBeOpened = false;

                const state = mkState({tree});

                assert.deepEqual(getAcceptableOpenedImageIds(state), []);
            });

            it('image is not opened', () => {
                const tree = _mkStateTree();
                tree.images.stateById['img1'].shouldBeOpened = false;

                const state = mkState({tree});

                assert.deepEqual(getAcceptableOpenedImageIds(state), []);
            });

            it('image is not acceptable', () => {
                const tree = _mkStateTree();
                tree.images.byId['img1'].status = SUCCESS;

                const state = mkState({tree});

                assert.deepEqual(getAcceptableOpenedImageIds(state), []);
            });
        });

        it('should return opened images', () => {
            const suitesById = {
                ...mkSuite({id: 's1', suiteIds: ['s2'], browserIds: ['b1']}),
                ...mkSuite({id: 's2', browserIds: ['b2']})
            };
            const suitesStateById = {
                s1: {shouldBeShown: true, shouldBeOpened: true},
                s2: {shouldBeShown: true, shouldBeOpened: true}
            };
            const suitesAllRootIds = ['s1'];

            const browsersById = {
                ...mkBrowser({id: 'b1', resultIds: ['r1']}),
                ...mkBrowser({id: 'b2', resultIds: ['r2']})
            };
            const browsersStateById = {
                b1: {shouldBeShown: true, shouldBeOpened: true, retryIndex: 0},
                b2: {shouldBeShown: true, shouldBeOpened: true, retryIndex: 0}
            };

            const resultsById = {
                ...mkResult({id: 'r1', parentId: 'b1', imageIds: ['img1']}),
                ...mkResult({id: 'r2', parentId: 'b2', imageIds: ['img2']})
            };
            const imagesById = {
                ...mkImage({id: 'img1', parentId: 'r1', stateName: 'first', status: FAIL}),
                ...mkImage({id: 'img2', parentId: 'r2', stateName: 'second', status: FAIL})
            };
            const imagesStateById = {img1: {shouldBeOpened: true}, img2: {shouldBeOpened: true}};

            const tree = mkStateTree({
                suitesById, suitesStateById, suitesAllRootIds, browsersById, browsersStateById,
                resultsById, imagesById, imagesStateById
            });
            const state = mkState({tree});

            assert.deepEqual(
                getAcceptableOpenedImageIds(state),
                ['img1', 'img2']
            );
        });
    });

    describe('"mkGetLastImageByStateName" factory', () => {
        it('should return image with passed "id" if there are no images with the same state name', () => {
            const browsersById = mkBrowser({id: 'b', resultIds: ['r1', 'r2']});
            const resultsById = {
                ...mkResult({id: 'r1', parentId: 'b', imageIds: ['img1']}),
                ...mkResult({id: 'r2', parentId: 'b', imageIds: ['img2']})
            };
            const imagesById = {
                ...mkImage({id: 'img1', parentId: 'r1', stateName: 'first'}),
                ...mkImage({id: 'img2', parentId: 'r2', stateName: 'second'})
            };

            const tree = mkStateTree({browsersById, resultsById, imagesById});
            const state = mkState({tree});

            const lastImage = mkGetLastImageByStateName()(state, {imageId: 'img1'});
            assert.deepEqual(lastImage, imagesById['img1']);
        });

        it('should return latest image with the same state name from last result', () => {
            const browsersById = mkBrowser({id: 'b', resultIds: ['r1', 'r2', 'r3']});
            const resultsById = {
                ...mkResult({id: 'r1', parentId: 'b', imageIds: ['img1']}),
                ...mkResult({id: 'r2', parentId: 'b', imageIds: ['img2']}),
                ...mkResult({id: 'r3', parentId: 'b', imageIds: []})
            };
            const imagesById = {
                ...mkImage({id: 'img1', parentId: 'r1', stateName: 'first'}),
                ...mkImage({id: 'img2', parentId: 'r2', stateName: 'first'})
            };

            const tree = mkStateTree({browsersById, resultsById, imagesById});
            const state = mkState({tree});

            const lastImage = mkGetLastImageByStateName()(state, {imageId: 'img1'});
            assert.deepEqual(lastImage, imagesById['img2']);
        });
    });

    describe('"areAllRootSuitesIdle"', () => {
        it(`should return true if there are all root suites with ${IDLE} status`, () => {
            const suitesById = {
                ...mkSuite({id: 's1', status: IDLE}),
                ...mkSuite({id: 's2', status: IDLE})
            };
            const tree = mkStateTree({suitesById, suitesAllRootIds: ['s1', 's2']});
            const state = mkState({tree});

            assert.isTrue(areAllRootSuitesIdle(state));
        });

        it(`should return false if there is a suite not with ${IDLE} status`, () => {
            const suitesById = {
                ...mkSuite({id: 's1', status: IDLE}),
                ...mkSuite({id: 's2', status: SUCCESS})
            };
            const tree = mkStateTree({suitesById, suitesAllRootIds: ['s1', 's2']});
            const state = mkState({tree});

            assert.isFalse(areAllRootSuitesIdle(state));
        });
    });

    describe('"getFailedTests" selector', () => {
        it('should return failed tests with metaInfo', () => {
            const suitesById = {
                ...mkSuite({id: 's1', suiteIds: ['s2'], browserIds: ['b1'], status: FAIL}),
                ...mkSuite({id: 's2', browserIds: ['b2'], status: FAIL})
            };
            const suitesFailedRootIds = ['s1'];
            const browsersById = {
                ...mkBrowser({id: 'b1', name: 'browser1', parentId: 's1', resultIds: ['r1']}),
                ...mkBrowser({id: 'b2', name: 'browser2', parentId: 's2', resultIds: ['r2']})
            };
            const resultsById = {
                ...mkResult({id: 'r1', parentId: 'b1', status: FAIL, metaInfo: {param: 'value1'}}),
                ...mkResult({id: 'r2', parentId: 'b2', status: FAIL, metaInfo: {param: 'value2'}})
            };

            const tree = mkStateTree({
                suitesById,
                suitesFailedRootIds,
                browsersById,
                resultsById
            });
            const state = mkState({tree});

            assert.deepEqual(
                getFailedTests(state),
                [
                    {
                        'browserName': 'browser1',
                        'metaInfo': {param: 'value1'},
                        'testName': 's1'
                    },
                    {
                        'browserName': 'browser2',
                        'metaInfo': {param: 'value2'},
                        'testName': 's2'
                    }
                ]
            );
        });
    });

    describe('"getFailedSuiteResults" helper', () => {
        it('should return all failed results', () => {
            const suitesById = {
                ...mkSuite({id: 's1', suiteIds: ['s2'], browserIds: ['b1'], status: FAIL}),
                ...mkSuite({id: 's2', browserIds: ['b2'], status: FAIL}),
                ...mkSuite({id: 's3', browserIds: ['b3'], status: SUCCESS})
            };
            const suitesFailedRootIds = ['s1'];
            const browsersById = {
                ...mkBrowser({id: 'b1', resultIds: ['r1']}),
                ...mkBrowser({id: 'b2', resultIds: ['r2']}),
                ...mkBrowser({id: 'b3', resultIds: ['r3']})
            };
            const resultsById = {
                ...mkResult({id: 'r1', parentId: 'b1'}),
                ...mkResult({id: 'r2', parentId: 'b2'}),
                ...mkResult({id: 'r3', parentId: 'b3'})
            };

            const tree = mkStateTree({
                suitesById,
                suitesFailedRootIds,
                browsersById,
                resultsById
            });

            assert.deepEqual(
                getFailedSuiteResults(tree),
                [resultsById.r1, resultsById.r2]
            );
        });
    });
});
