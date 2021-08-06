import {SUCCESS, FAIL, IDLE} from 'lib/constants/test-statuses';
import {
    getAcceptableImagesByStateName,
    mkGetLastImageByStateName,
    areAllRootSuitesIdle,
    getFailedTests
} from 'lib/static/modules/selectors/tree';
import {mkSuite, mkBrowser, mkResult, mkImage, mkStateTree, mkStateView} from '../../state-utils';

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
            const suitesById = mkSuite({id: 's1', status: FAIL, browserIds: ['b']});
            const browsersById = mkBrowser({id: 'b', name: 'browser', parentId: 'test', resultIds: ['r1']});
            const resultsById = mkResult({id: 'r1', parentId: 'b', status: FAIL, metaInfo: {param: 'value'}});

            const tree = mkStateTree({
                suitesFailedRootIds: ['s1'],
                suitesById,
                browsersById,
                resultsById
            });
            const state = mkState({tree});

            assert.deepEqual(
                getFailedTests(state),
                [{
                    'browserName': 'browser',
                    'metaInfo': {param: 'value'},
                    'testName': 'test'
                }]
            );
        });
    });
});
