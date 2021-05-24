'use strict';

const proxyquire = require('proxyquire');
const {defaults} = require('lodash');
const {FAIL, SUCCESS} = require('lib/constants/test-statuses');
const viewModes = require('lib/constants/view-modes');

describe('static/modules/group-errors', () => {
    const sandbox = sinon.sandbox.create();
    let groupErrors, shouldShowBrowser, isTestNameMatchFilters, isAssertViewError;

    const mkRootSuite = (opts) => {
        const rootSuite = defaults(opts, {
            id: 'default-root-suite-id',
            parentId: null,
            status: FAIL,
            suiteIds: []
        });

        return {[rootSuite.id]: rootSuite};
    };

    const mkSuite = (opts) => {
        const suite = defaults(opts, {
            id: 'default-suite-id',
            parentId: 'default-root-suite-id',
            status: FAIL,
            browserIds: []
        });

        return {[suite.id]: suite};
    };

    const mkBrowser = (opts) => {
        const browser = defaults(opts, {
            id: 'default-bro-id',
            parentId: 'default-test-id',
            resultIds: []
        });

        return {[browser.id]: browser};
    };

    const mkResult = (opts) => {
        const result = defaults(opts, {
            id: 'default-result-id',
            parentId: 'default-bro-id',
            status: FAIL,
            imageIds: []
        });

        return {[result.id]: result};
    };

    const mkImage = (opts) => {
        const image = defaults(opts, {
            id: 'default-image-id',
            status: FAIL
        });

        return {[image.id]: image};
    };

    const mkTree = ({suitesById = {}, failedRootIds = [], browsersById = {}, resultsById = {}, imagesById = {}} = {}) => {
        return {
            suites: {byId: suitesById, failedRootIds},
            browsers: {byId: browsersById},
            results: {byId: resultsById},
            images: {byId: imagesById}
        };
    };

    beforeEach(() => {
        shouldShowBrowser = sandbox.stub().named('shouldShowBrowser').returns(true);
        isTestNameMatchFilters = sandbox.stub().named('isTestNameMatchFilters').returns(true);
        isAssertViewError = sandbox.stub().named('isAssertViewError').returns(false);

        const module = proxyquire('lib/static/modules/group-errors', {
            './selectors/tree': {shouldShowBrowser},
            './utils': {isTestNameMatchFilters, isAssertViewError}
        });

        groupErrors = module.groupErrors;
    });

    afterEach(() => sandbox.restore());

    it('should collect errors from all tests if viewMode is "all"', () => {
        const browsersById = {
            ...mkBrowser({id: 'yabro-1', parentId: 'test-1'}),
            ...mkBrowser({id: 'yabro-2', parentId: 'test-2'})
        };
        const resultsById = {
            ...mkResult({id: 'res-1', parentId: 'yabro-1', error: {message: 'err-1'}}),
            ...mkResult({id: 'res-2', parentId: 'yabro-2', error: {message: 'err-2'}})
        };
        const tree = mkTree({browsersById, resultsById});

        const result = groupErrors({tree, viewMode: viewModes.ALL});

        assert.deepEqual(result, [
            {
                pattern: 'err-1',
                name: 'err-1',
                count: 1,
                browserIds: ['yabro-1']
            },
            {
                pattern: 'err-2',
                name: 'err-2',
                count: 1,
                browserIds: ['yabro-2']
            }
        ]);
    });

    it('should collect errors only from failed tests if viewMode is "failed"', () => {
        const suitesById = {
            ...mkRootSuite({id: 'suite-1', status: FAIL, suiteIds: ['test-1', 'test-2']}),
            ...mkSuite({id: 'test-1', status: FAIL, browserIds: ['yabro-1']}),
            ...mkSuite({id: 'test-2', status: SUCCESS, browserIds: ['yabro-2']})
        };
        const failedRootIds = ['suite-1'];
        const browsersById = {
            ...mkBrowser({id: 'yabro-1', parentId: 'test-1', resultIds: ['res-1']}),
            ...mkBrowser({id: 'yabro-2', parentId: 'test-2', resultIds: ['res-2']})
        };
        const resultsById = {
            ...mkResult({id: 'res-1', parentId: 'yabro-1', status: FAIL, error: {message: 'err-1'}}),
            ...mkResult({id: 'res-2', parentId: 'yabro-2', status: SUCCESS, error: {message: 'err-2'}})
        };
        const tree = mkTree({suitesById, failedRootIds, browsersById, resultsById});

        const result = groupErrors({tree, viewMode: viewModes.FAILED});

        assert.deepEqual(result, [{
            pattern: 'err-1',
            name: 'err-1',
            count: 1,
            browserIds: ['yabro-1']
        }]);
    });

    it('should collect errors from tests and images', () => {
        const browsersById = {
            ...mkBrowser({id: 'yabro-1', parentId: 'test-1'})
        };
        const resultsById = {
            ...mkResult({id: 'res-1', parentId: 'yabro-1', imageIds: ['img-1'], error: {message: 'test-err'}})
        };
        const imagesById = {
            ...mkImage({id: 'img-1', error: {message: 'img-err'}})
        };
        const tree = mkTree({browsersById, resultsById, imagesById});
        isAssertViewError.withArgs(tree.results.byId['res-1'].error).returns(false);

        const result = groupErrors({tree});

        assert.deepEqual(result, [
            {
                pattern: 'img-err',
                name: 'img-err',
                count: 1,
                browserIds: ['yabro-1']
            },
            {
                pattern: 'test-err',
                name: 'test-err',
                count: 1,
                browserIds: ['yabro-1']
            }
        ]);
    });

    it('should collect errors only from images if test has assert view error', () => {
        const browsersById = {
            ...mkBrowser({id: 'yabro-1', parentId: 'test-1'})
        };
        const resultsById = {
            ...mkResult({id: 'res-1', parentId: 'yabro-1', imageIds: ['img-1'], error: {message: 'err'}})
        };
        const imagesById = {
            ...mkImage({id: 'img-1', error: {message: 'img-err'}})
        };
        const tree = mkTree({browsersById, resultsById, imagesById});
        isAssertViewError.withArgs(tree.results.byId['res-1'].error).returns(true);

        const result = groupErrors({tree});

        assert.deepEqual(result, [
            {
                pattern: 'img-err',
                name: 'img-err',
                count: 1,
                browserIds: ['yabro-1']
            }
        ]);
    });

    it('should collect image comparison fails', () => {
        const browsersById = {
            ...mkBrowser({id: 'yabro-1', parentId: 'test-1'})
        };
        const resultsById = {
            ...mkResult({id: 'res-1', parentId: 'yabro-1', imageIds: ['img-1']})
        };
        const imagesById = {
            ...mkImage({id: 'img-1', diffImg: {}})
        };
        const tree = mkTree({browsersById, resultsById, imagesById});

        const result = groupErrors({tree});

        assert.deepEqual(result, [{
            pattern: 'image comparison failed',
            name: 'image comparison failed',
            count: 1,
            browserIds: ['yabro-1']
        }]);
    });

    it('should group equal errors', () => {
        const browsersById = {
            ...mkBrowser({id: 'yabro-1', parentId: 'test-1'}),
            ...mkBrowser({id: 'yabro-2', parentId: 'test-2'})
        };
        const resultsById = {
            ...mkResult({id: 'res-1', parentId: 'yabro-1', error: {message: 'err'}}),
            ...mkResult({id: 'res-2', parentId: 'yabro-2', error: {message: 'err'}})
        };
        const tree = mkTree({browsersById, resultsById});

        const result = groupErrors({tree});

        assert.deepEqual(result, [{
            pattern: 'err',
            name: 'err',
            count: 2,
            browserIds: ['yabro-1', 'yabro-2']
        }]);
    });

    it('should filter by test name', () => {
        const browsersById = {
            ...mkBrowser({id: 'yabro-1', parentId: 'test-1'}),
            ...mkBrowser({id: 'yabro-2', parentId: 'test-2'})
        };
        const resultsById = {
            ...mkResult({id: 'res-1', parentId: 'yabro-1', error: {message: 'err-1'}}),
            ...mkResult({id: 'res-2', parentId: 'yabro-2', error: {message: 'err-2'}})
        };
        const tree = mkTree({browsersById, resultsById});

        isTestNameMatchFilters
            .withArgs('test-1', 'test-1', true).returns(true)
            .withArgs('test-2', 'test-1', true).returns(false);

        const result = groupErrors({tree, testNameFilter: 'test-1', strictMatchFilter: true});

        assert.deepEqual(result, [{
            pattern: 'err-1',
            name: 'err-1',
            count: 1,
            browserIds: ['yabro-1']
        }]);
    });

    it('should filter by browser', () => {
        const browsersById = {
            ...mkBrowser({id: 'yabro-1', parentId: 'test-1'}),
            ...mkBrowser({id: 'yabro-2', parentId: 'test-2'})
        };
        const resultsById = {
            ...mkResult({id: 'res-1', parentId: 'yabro-1', error: {message: 'err-1'}}),
            ...mkResult({id: 'res-2', parentId: 'yabro-2', error: {message: 'err-2'}})
        };
        const tree = mkTree({browsersById, resultsById});
        const filteredBrowsers = ['yabro-1'];

        shouldShowBrowser
            .withArgs(browsersById['yabro-1'], filteredBrowsers).returns(true)
            .withArgs(browsersById['yabro-2'], filteredBrowsers).returns(false);

        const result = groupErrors({tree, filteredBrowsers});

        assert.deepEqual(result, [{
            pattern: 'err-1',
            name: 'err-1',
            count: 1,
            browserIds: ['yabro-1']
        }]);
    });

    it('should group by regexp', () => {
        const browsersById = {
            ...mkBrowser({id: 'yabro-1', parentId: 'test-1'}),
            ...mkBrowser({id: 'yabro-2', parentId: 'test-2'})
        };
        const resultsById = {
            ...mkResult({id: 'res-1', parentId: 'yabro-1', error: {message: 'err-1'}}),
            ...mkResult({id: 'res-2', parentId: 'yabro-2', error: {message: 'err-2'}})
        };
        const tree = mkTree({browsersById, resultsById});
        const errorPatterns = [
            {
                name: 'Name group: err',
                pattern: 'err-.*',
                regexp: /err-.*/
            }
        ];

        const result = groupErrors({tree, errorPatterns});

        assert.deepEqual(result, [{
            pattern: 'err-.*',
            name: 'Name group: err',
            count: 2,
            browserIds: ['yabro-1', 'yabro-2']
        }]);
    });
});
