import {SUCCESS, FAIL, ERROR, IDLE} from 'lib/constants/test-statuses';
import {
    getAcceptableImagesByStateName,
    mkGetLastImageByStateName,
    mkShouldSuiteBeShown,
    mkShouldBrowserBeShown,
    areAllRootSuitesIdle
} from 'lib/static/modules/selectors/tree';
import viewModes from 'lib/constants/view-modes';
import {mkSuite, mkBrowser, mkResult, mkImage, mkStateTree, mkStateView} from '../../state-utils';

describe('tree selectors', () => {
    const mkState = ({tree = mkStateTree(), view = mkStateView()} = {}) => ({tree, view});

    describe('"getAcceptableImagesByStateName" selector', () => {
        it('should return empty object if there are no acceptable images', () => {
            const browsersById = mkBrowser({id: 'b', resultIds: ['r1']});
            const resultsById = mkResult({id: 'r1', parentId: 'b', imageIds: ['img1']});
            const imagesById = mkImage({id: 'img1', parentId: 'r1', status: SUCCESS});

            const tree = mkStateTree({browsersById, resultsById, imagesById});
            const state = mkState({tree});

            assert.deepEqual(getAcceptableImagesByStateName(state), {});
        });

        it('should return images grouped by state name', () => {
            const browsersById = mkBrowser({id: 'b', resultIds: ['r1', 'r2']});
            const resultsById = {
                ...mkResult({id: 'r1', parentId: 'b', imageIds: ['img1']}),
                ...mkResult({id: 'r2', parentId: 'b', imageIds: ['img2']})
            };
            const imagesById = {
                ...mkImage({id: 'img1', parentId: 'r1', stateName: 'first', status: FAIL}),
                ...mkImage({id: 'img2', parentId: 'r2', stateName: 'first', status: FAIL})
            };

            const tree = mkStateTree({browsersById, resultsById, imagesById});
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
            const resultsById = {
                ...mkResult({id: 'r1', parentId: 'b1', imageIds: ['img1']}),
                ...mkResult({id: 'r2', parentId: 'b2', imageIds: ['img2']})
            };
            const imagesById = {
                ...mkImage({id: 'img1', parentId: 'r1', stateName: 'first', status: FAIL}),
                ...mkImage({id: 'img2', parentId: 'r2', stateName: 'second', status: FAIL})
            };

            const tree = mkStateTree({browsersById, resultsById, imagesById});
            const state = mkState({tree});

            const imagesByStateName = getAcceptableImagesByStateName(state);
            assert.deepEqual(Object.keys(imagesByStateName), ['b2 second', 'b1 first']);
        });

        it('should return images sorted by browser id', () => {
            const browsersById = {
                ...mkBrowser({id: 'b2', name: 'bro2', parentId: 'suite', resultIds: ['r2']}),
                ...mkBrowser({id: 'b1', name: 'bro1', parentId: 'suite', resultIds: ['r1']})
            };
            const resultsById = {
                ...mkResult({id: 'r1', parentId: 'b1', imageIds: ['img1']}),
                ...mkResult({id: 'r2', parentId: 'b2', imageIds: ['img2']})
            };
            const imagesById = {
                ...mkImage({id: 'img1', parentId: 'r1', stateName: 'first', status: FAIL}),
                ...mkImage({id: 'img2', parentId: 'r2', stateName: 'second', status: FAIL})
            };

            const tree = mkStateTree({browsersById, resultsById, imagesById});
            const state = mkState({tree});

            const imagesByStateName = getAcceptableImagesByStateName(state);
            assert.deepEqual(Object.keys(imagesByStateName), ['b1 first', 'b2 second']);
        });

        it('should return images from browser which matched to the passed filter', () => {
            const browsersById = {
                ...mkBrowser({id: 'b1', name: 'bro1', version: '1', parentId: 'suiteB', resultIds: ['r1']}),
                ...mkBrowser({id: 'b2', name: 'bro1', version: '2', parentId: 'suiteB', resultIds: ['r2']}),
                ...mkBrowser({id: 'b3', name: 'bro2', version: '1', parentId: 'suiteA', resultIds: ['r3']})
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

            const tree = mkStateTree({browsersById, resultsById, imagesById});
            const view = mkStateView({filteredBrowsers: [{id: 'bro1', versions: ['1']}]});
            const state = mkState({tree, view});

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

    describe('"mkShouldSuiteBeShown" factory', () => {
        describe('viewMode', () => {
            [
                {name: '"all" for success suite', status: SUCCESS, viewMode: viewModes.ALL},
                {name: '"all" for error suite', status: ERROR, viewMode: viewModes.ALL},
                {name: '"failed" for error suite', status: ERROR, viewMode: viewModes.FAILED}
            ].forEach(({name, status, viewMode}) => {
                it(`should be true if viewMode is ${name}`, () => {
                    const suitesById = {
                        ...mkSuite({id: 's1', status, suiteIds: ['s2']}),
                        ...mkSuite({id: 's2', status, browserIds: ['b1']})
                    };
                    const browsersById = mkBrowser({id: 'b1'});

                    const tree = mkStateTree({suitesById, browsersById});
                    const state = mkState({tree, view: {viewMode}});

                    assert.isTrue(mkShouldSuiteBeShown()(state, {suiteId: 's1'}));
                });
            });

            it('should be false if viewMode is "failed" for success suite', () => {
                const suitesById = {
                    ...mkSuite({id: 's1', status: SUCCESS, suiteIds: ['s2']}),
                    ...mkSuite({id: 's2', status: SUCCESS, browserIds: ['b1']})
                };
                const browsersById = mkBrowser({id: 'b1'});

                const tree = mkStateTree({suitesById, browsersById});
                const state = mkState({tree, view: {viewMode: viewModes.FAILED}});

                assert.isFalse(mkShouldSuiteBeShown()(state, {suiteId: 's1'}));
            });
        });

        describe('testNameFilter', () => {
            [
                {name: 'top-level title matches', testNameFilter: 's1'},
                {name: 'bottom-level title matches', testNameFilter: 's2'},
                {name: 'if full title matches', testNameFilter: 's1 s2'}
            ].forEach(({name, testNameFilter}) => {
                it(`should be true if ${name}`, () => {
                    const suitesById = {
                        ...mkSuite({id: 's1', status: SUCCESS, suiteIds: ['s2']}),
                        ...mkSuite({id: 's2', status: SUCCESS, browserIds: ['b1']})
                    };
                    const browsersById = mkBrowser({id: 'b1', parentId: 's1 s2'});

                    const tree = mkStateTree({suitesById, browsersById});
                    const view = mkStateView({testNameFilter});
                    const state = mkState({tree, view});

                    assert.isTrue(mkShouldSuiteBeShown()(state, {suiteId: 's1'}));
                });
            });

            [
                {name: 'no matches found', testNameFilter: 'not_found'},
                {name: 'only part of top-level title matches', testNameFilter: 's1 s3'},
                {name: 'only part of bottom-level title matches', testNameFilter: 's3 s2'}
            ].forEach(({name, testNameFilter}) => {
                it(`should be false if ${name}`, () => {
                    const suitesById = {
                        ...mkSuite({id: 's1', status: SUCCESS, suiteIds: ['s2']}),
                        ...mkSuite({id: 's2', status: SUCCESS, browserIds: ['b1']})
                    };
                    const browsersById = mkBrowser({id: 'b1', parentId: 's1 s2'});

                    const tree = mkStateTree({suitesById, browsersById});
                    const view = mkStateView({testNameFilter});
                    const state = mkState({tree, view});

                    assert.isFalse(mkShouldSuiteBeShown()(state, {suiteId: 's1'}));
                });
            });
        });

        describe('strictMatchFilter', () => {
            [
                {name: 'only top-level title matches', testNameFilter: 's1 s3'},
                {name: 'only bottom-level title matches', testNameFilter: 's3 s1'},
                {name: 'not matches found', testNameFilter: 'not_found'}
            ].forEach(({name, testNameFilter}) => {
                it(`should be false if ${name}`, () => {
                    const suitesById = {
                        ...mkSuite({id: 's1', status: SUCCESS, suiteIds: ['s2']}),
                        ...mkSuite({id: 's2', status: SUCCESS, browserIds: ['b1']})
                    };
                    const browsersById = mkBrowser({id: 'b1', parentId: 's1 s2'});

                    const tree = mkStateTree({suitesById, browsersById});
                    const view = mkStateView({testNameFilter, strictMatchFilter: true});
                    const state = mkState({tree, view});

                    assert.isFalse(mkShouldSuiteBeShown()(state, {suiteId: 's1'}));
                });
            });

            it('should be true if full title matches', () => {
                const suitesById = {
                    ...mkSuite({id: 's1', status: SUCCESS, suiteIds: ['s2']}),
                    ...mkSuite({id: 's2', status: SUCCESS, browserIds: ['b1']})
                };
                const browsersById = mkBrowser({id: 'b1', parentId: 's1 s2'});

                const tree = mkStateTree({suitesById, browsersById});
                const view = mkStateView({testNameFilter: 's1 s2', strictMatchFilter: true});
                const state = mkState({tree, view});

                assert.isTrue(mkShouldSuiteBeShown()(state, {suiteId: 's1'}));
            });
        });

        describe('errorGroupBrowserIds', () => {
            it('should be false if browser id not match', () => {
                const suitesById = {
                    ...mkSuite({id: 's1', status: SUCCESS, suiteIds: ['s2']}),
                    ...mkSuite({id: 's2', status: SUCCESS, browserIds: ['b1']})
                };
                const browsersById = mkBrowser({id: 'b1', parentId: 's1 s2'});

                const tree = mkStateTree({suitesById, browsersById});
                const state = mkState({tree});

                assert.isFalse(mkShouldSuiteBeShown()(state, {suiteId: 's1', errorGroupBrowserIds: ['not_found']}));
            });

            it('should be true if browser id is match', () => {
                const suitesById = {
                    ...mkSuite({id: 's1', status: SUCCESS, suiteIds: ['s2']}),
                    ...mkSuite({id: 's2', status: SUCCESS, browserIds: ['b1']})
                };
                const browsersById = mkBrowser({id: 'b1', parentId: 's1 s2'});

                const tree = mkStateTree({suitesById, browsersById});
                const state = mkState({tree});

                assert.isTrue(mkShouldSuiteBeShown()(state, {suiteId: 's1', errorGroupBrowserIds: ['b1']}));
            });
        });

        describe('filteredBrowsers', () => {
            [
                {name: 'browser name is equal', filteredBrowsers: [{id: 'yabro'}]},
                {name: 'browser name and versions are equal', filteredBrowsers: [{id: 'yabro', versions: ['1']}]}
            ].forEach(({name, filteredBrowsers}) => {
                it(`should be true if ${name}`, () => {
                    const suitesById = {
                        ...mkSuite({id: 's1', status: SUCCESS, suiteIds: ['s2']}),
                        ...mkSuite({id: 's2', status: SUCCESS, browserIds: ['b1']})
                    };
                    const browsersById = mkBrowser({id: 'b1', name: 'yabro', version: '1', parentId: 's1 s2'});

                    const tree = mkStateTree({suitesById, browsersById});
                    const view = mkStateView({filteredBrowsers});
                    const state = mkState({tree, view});

                    assert.isTrue(mkShouldSuiteBeShown()(state, {suiteId: 's1'}));
                });
            });

            [
                {name: 'browser name is not equal', filteredBrowsers: [{id: 'some-bro'}]},
                {name: 'browser name is equal but versions arent', filteredBrowsers: [{id: 'yabro', versions: ['2']}]}
            ].forEach(({name, filteredBrowsers}) => {
                it(`should be true if ${name}`, () => {
                    const suitesById = {
                        ...mkSuite({id: 's1', status: SUCCESS, suiteIds: ['s2']}),
                        ...mkSuite({id: 's2', status: SUCCESS, browserIds: ['b1']})
                    };
                    const browsersById = mkBrowser({id: 'b1', name: 'yabro', version: '1', parentId: 's1 s2'});

                    const tree = mkStateTree({suitesById, browsersById});
                    const view = mkStateView({filteredBrowsers});
                    const state = mkState({tree, view});

                    assert.isFalse(mkShouldSuiteBeShown()(state, {suiteId: 's1'}));
                });
            });
        });
    });

    describe('"mkShouldBrowserBeShown" factory', () => {
        describe('viewMode', () => {
            [
                {name: '"all" for success browser', status: SUCCESS, viewMode: viewModes.ALL},
                {name: '"all" for error browser', status: ERROR, viewMode: viewModes.ALL},
                {name: '"failed" for error browser', status: ERROR, viewMode: viewModes.FAILED}
            ].forEach(({name, status, viewMode}) => {
                it(`should be true if viewMode is ${name}`, () => {
                    const browsersById = mkBrowser({id: 'b1'});
                    const resultsById = mkResult({id: 'r1', status});

                    const tree = mkStateTree({browsersById, resultsById});
                    const state = mkState({tree, view: {viewMode}});

                    assert.isTrue(mkShouldBrowserBeShown()(state, {suiteId: 's1', result: resultsById['r1']}));
                });
            });

            it('should be false if viewMode is "failed" for success browser', () => {
                const browsersById = mkBrowser({id: 'b1', resultIds: ['r1']});
                const resultsById = mkResult({id: 'r1', status: SUCCESS});

                const tree = mkStateTree({browsersById, resultsById});
                const state = mkState({tree, view: {viewMode: viewModes.FAILED}});

                assert.isFalse(mkShouldBrowserBeShown()(state, {browserId: 's1', result: resultsById['r1']}));
            });
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
});
