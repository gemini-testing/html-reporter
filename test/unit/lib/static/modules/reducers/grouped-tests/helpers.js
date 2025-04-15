const proxyquire = require('proxyquire');
const {ViewMode} = require('lib/constants/view-modes');
const {mkBrowser, mkResult, mkStateTree} = require('../../../state-utils');

describe('lib/static/modules/reducers/grouped-tests/helpers', () => {
    const sandbox = sinon.sandbox.create();
    let module, getFailedSuiteResults, isTestNameMatchFilters, shouldShowBrowser;

    beforeEach(() => {
        getFailedSuiteResults = sandbox.stub().named('getFailedSuiteResults').returns([]);
        isTestNameMatchFilters = sandbox.stub().named('isTestNameMatchFilters').returns(true);
        shouldShowBrowser = sandbox.stub().named('shouldShowBrowser').returns(true);

        module = proxyquire('lib/static/modules/reducers/grouped-tests/helpers', {
            '../../selectors/tree': {getFailedSuiteResults},
            '../../utils': {isTestNameMatchFilters, shouldShowBrowser}
        });
    });

    afterEach(() => sandbox.restore());

    describe('"handleActiveResults" method', () => {
        it('should throw error if "resultCb" argument is not a funciton', () => {
            assert.throws(
                () => module.handleActiveResults({resultCb: 'string'}),
                /"resultCb" argument must be a function, but got string/
            );
        });

        it(`should handle results from all tests if viewMode is "${ViewMode.ALL}"`, () => {
            const browsersById = {
                ...mkBrowser({id: 'yabro-1', parentId: 'test-1'}),
                ...mkBrowser({id: 'yabro-2', parentId: 'test-2'})
            };
            const browsersStateById = {
                'yabro-1': {id: 'yabro-1', parentId: 'test-1', shouldBeShown: true},
                'yabro-2': {id: 'yabro-2', parentId: 'test-2', shouldBeShown: true}
            };
            const resultsById = {
                ...mkResult({id: 'res-1', parentId: 'yabro-1'}),
                ...mkResult({id: 'res-2', parentId: 'yabro-2'})
            };
            const tree = mkStateTree({browsersById, browsersStateById, resultsById});
            const resultCb = sinon.spy().named('onResultCb');

            module.handleActiveResults({tree, resultCb, viewMode: ViewMode.ALL});

            assert.calledTwice(resultCb);
            assert.calledWith(resultCb.firstCall, tree.results.byId['res-1']);
            assert.calledWith(resultCb.secondCall, tree.results.byId['res-2']);
        });

        it(`should handle results only from failed tests if viewMode is "${ViewMode.FAILED}"`, () => {
            const browsersById = {
                ...mkBrowser({id: 'yabro-1', parentId: 'test-1'}),
                ...mkBrowser({id: 'yabro-2', parentId: 'test-2'})
            };
            const resultsById = {
                ...mkResult({id: 'res-1', parentId: 'yabro-1'}),
                ...mkResult({id: 'res-2', parentId: 'yabro-2'})
            };
            const browsersStateById = {
                'yabro-1': {id: 'yabro-1', parentId: 'test-1', shouldBeShown: true},
                'yabro-2': {id: 'yabro-2', parentId: 'test-2', shouldBeShown: true}
            };
            const tree = mkStateTree({browsersById, browsersStateById, resultsById});
            const resultCb = sinon.spy().named('onResultCb');
            getFailedSuiteResults.withArgs(tree).returns([tree.results.byId['res-1']]);

            module.handleActiveResults({tree, resultCb, viewMode: ViewMode.FAILED});

            assert.calledOnceWith(resultCb, tree.results.byId['res-1']);
        });

        it(`should take browsers state into account`, () => {
            const browsersById = {
                ...mkBrowser({id: 'yabro-1', parentId: 'test-1'}),
                ...mkBrowser({id: 'yabro-2', parentId: 'test-2'})
            };
            const resultsById = {
                ...mkResult({id: 'res-1', parentId: 'yabro-1'}),
                ...mkResult({id: 'res-2', parentId: 'yabro-2'})
            };
            const browsersStateById = {
                'yabro-1': {id: 'yabro-1', parentId: 'test-1', shouldBeShown: true},
                'yabro-2': {id: 'yabro-2', parentId: 'test-2', shouldBeShown: false}
            };
            const tree = mkStateTree({browsersById, browsersStateById, resultsById});
            const resultCb = sinon.spy().named('onResultCb');

            module.handleActiveResults({tree, resultCb});

            assert.calledOnceWith(resultCb, tree.results.byId['res-1']);
        });

        it('should filter tests by specified browsers', () => {
            const browsersById = {
                ...mkBrowser({id: 'yabro-1', parentId: 'test-1'}),
                ...mkBrowser({id: 'yabro-2', parentId: 'test-2'})
            };
            const resultsById = {
                ...mkResult({id: 'res-1', parentId: 'yabro-1'}),
                ...mkResult({id: 'res-2', parentId: 'yabro-2'})
            };
            const browsersStateById = {
                'yabro-1': {id: 'yabro-1', parentId: 'test-1', shouldBeShown: true},
                'yabro-2': {id: 'yabro-2', parentId: 'test-2', shouldBeShown: true}
            };
            const tree = mkStateTree({browsersById, browsersStateById, resultsById});
            const resultCb = sinon.spy().named('onResultCb');
            const filteredBrowsers = ['yabro-1'];

            shouldShowBrowser
                .withArgs(browsersById['yabro-1'], filteredBrowsers).returns(true)
                .withArgs(browsersById['yabro-2'], filteredBrowsers).returns(false);

            module.handleActiveResults({tree, resultCb, filteredBrowsers});

            assert.calledOnceWith(resultCb, tree.results.byId['res-1']);
        });
    });

    describe('"addGroupItem" method', () => {
        it('should store equal values to one group', () => {
            const group = {};
            const res1 = {parentId: 'yabro-1', id: 'res-1'};
            const res2 = {parentId: 'yabro-2', id: 'res-2'};

            module.addGroupItem({group, result: res1, value: 'value-1'});
            module.addGroupItem({group, result: res2, value: 'value-1'});

            assert.deepEqual(group, {
                'value-1': {
                    pattern: 'value-1',
                    name: 'value-1',
                    browserIds: [res1.parentId, res2.parentId],
                    resultIds: [res1.id, res2.id],
                    testCount: 2,
                    resultCount: 2
                }
            });
        });

        it('should store not equal values to few groups', () => {
            const group = {};
            const res1 = {parentId: 'yabro-1', id: 'res-1'};
            const res2 = {parentId: 'yabro-2', id: 'res-2'};

            module.addGroupItem({group, result: res1, value: 'value-1'});
            module.addGroupItem({group, result: res2, value: 'value-2'});

            assert.deepEqual(group, {
                'value-1': {
                    pattern: 'value-1',
                    name: 'value-1',
                    browserIds: [res1.parentId],
                    resultIds: [res1.id],
                    testCount: 1,
                    resultCount: 1
                },
                'value-2': {
                    pattern: 'value-2',
                    name: 'value-2',
                    browserIds: [res2.parentId],
                    resultIds: [res2.id],
                    testCount: 1,
                    resultCount: 1
                }
            });
        });

        it('should store values matched to pattern in one group', () => {
            const group = {};
            const res1 = {parentId: 'yabro-1', id: 'res-1'};
            const res2 = {parentId: 'yabro-2', id: 'res-2'};
            const patterns = [{
                name: 'Name group: value',
                pattern: 'value-.*',
                regexp: /value-.*/
            }];

            module.addGroupItem({group, result: res1, value: 'value-1', patterns});
            module.addGroupItem({group, result: res2, value: 'value-2', patterns});

            assert.deepEqual(group, {
                'Name group: value': {
                    pattern: 'value-.*',
                    name: 'Name group: value',
                    browserIds: [res1.parentId, res2.parentId],
                    resultIds: [res1.id, res2.id],
                    testCount: 2,
                    resultCount: 2
                }
            });
        });

        [
            {name: 'object', value: {foo: 'bar'}, expected: '{"foo":"bar"}'},
            {name: 'null', value: null, expected: 'null'},
            {name: 'undefined', value: undefined, expected: 'undefined'},
            {name: 'number', value: 100, expected: '100'},
            {name: 'boolean', value: false, expected: 'false'}
        ].forEach(({name, value, expected}) => {
            it(`should stringify ${name} value before store it`, () => {
                const group = {};
                const result = {parentId: 'yabro', id: 'res'};

                module.addGroupItem({group, result, value});

                assert.deepEqual(group, {
                    [expected]: {
                        name: expected,
                        pattern: expected,
                        browserIds: [result.parentId],
                        resultIds: [result.id],
                        testCount: 1,
                        resultCount: 1
                    }
                });
            });
        });
    });

    describe('"sortGroupValues" method', () => {
        it('should sort values by "testCount"', () => {
            const values = {
                value1: {testCount: 1},
                value2: {testCount: 10}
            };

            const res = module.sortGroupValues(values);

            assert.deepEqual(res, [{testCount: 10}, {testCount: 1}]);
        });
    });
});
