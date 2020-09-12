import {defaults} from 'lodash';
import {SUCCESS, ERROR, IDLE} from 'lib/constants/test-statuses';
import {mkShouldSuiteBeShown, mkShouldBrowserBeShown, areAllRootSuitesIdle} from 'lib/static/modules/selectors/tree';
import viewModes from 'lib/constants/view-modes';

describe('tree selectors', () => {
    const mkSuite = (opts) => {
        const result = defaults(opts, {
            id: 'default-suite-id',
            parentId: null,
            name: 'default-name',
            status: SUCCESS
        });

        return {[result.id]: result};
    };

    const mkBrowser = (opts) => {
        const browser = defaults(opts, {
            id: 'default-bro-id',
            name: 'default-bro',
            parentId: 'default-test-id',
            resultIds: [],
            versions: []
        });

        return {[browser.id]: browser};
    };

    const mkResult = (opts) => {
        const result = defaults(opts, {
            id: 'default-result-id',
            parentId: 'default-bro-id',
            status: SUCCESS,
            imageIds: []
        });

        return {[result.id]: result};
    };

    const mkStateTree = ({suitesById = {}, suitesAllRootIds = [], browsersById = {}, resultsById = {}, imagesById = {}} = {}) => {
        return {
            suites: {byId: suitesById, allRootIds: suitesAllRootIds},
            browsers: {byId: browsersById},
            results: {byId: resultsById},
            images: {byId: imagesById}
        };
    };

    const mkStateView = (opts = {}) => {
        return defaults(opts, {
            viewMode: viewModes.ALL,
            testNameFilter: '',
            strictMatchFilter: false,
            filteredBrowsers: []
        });
    };

    const mkState = ({tree = mkStateTree(), view = mkStateView()} = {}) => ({tree, view});

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
                    const browsersById = mkBrowser({id: 'b1', name: 'yabro', versions: ['1'], parentId: 's1 s2'});

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
                    const browsersById = mkBrowser({id: 'b1', name: 'yabro', versions: ['1'], parentId: 's1 s2'});

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
