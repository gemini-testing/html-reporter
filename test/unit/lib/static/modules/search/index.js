'use strict';

const proxyquire = require('proxyquire');

describe('lib/static/modules/search', () => {
    let originalWorker;
    let workers;
    let searchModule;

    class FakeWorker {
        constructor() {
            this.messages = [];
            this.terminate = sinon.stub();
            workers.push(this);
        }

        postMessage(message) {
            this.messages.push(message);
        }

        respond(message) {
            this.onmessage({data: message});
        }
    }

    const mkTree_ = () => ({
        suites: {byId: {}, byHash: {}, allIds: [], allRootIds: []},
        browsers: {byId: {}, allIds: []},
        results: {byId: {}, allIds: []},
        images: {byId: {}, allIds: []}
    });

    const mkPatch_ = () => ({
        affectedRootIds: [],
        affectedSuiteIds: [],
        suites: {addedIds: [], removedIds: [], byId: {}, allRootIds: []},
        browsers: {addedIds: [], removedIds: [], byId: {}},
        results: {addedIds: [], removedIds: [], byId: {}},
        images: {addedIds: [], removedIds: [], byId: {}}
    });

    beforeEach(() => {
        originalWorker = global.Worker;
        workers = [];
        global.Worker = FakeWorker;
        searchModule = proxyquire.noPreserveCache()('lib/static/modules/search', {});
    });

    afterEach(() => {
        global.Worker = originalWorker;
    });

    it('should not confuse a patch acknowledgement with a search result', async () => {
        const initPromise = searchModule.initSearch(mkTree_());
        const worker = workers[0];
        const initMessage = worker.messages[0];
        worker.respond({type: 'ready', requestId: initMessage.requestId});
        await initPromise;

        const dispatch = sinon.stub();
        let searchResolved = false;
        const searchPromise = searchModule.search('new test', false, false, false, dispatch)
            .then(() => searchResolved = true);
        const searchMessage = worker.messages.at(-1);
        const patchPromise = searchModule.patchSearch(mkTree_(), mkPatch_());
        const patchMessage = worker.messages.at(-1);

        worker.respond({type: 'patched', requestId: patchMessage.requestId});
        await patchPromise;

        assert.isFalse(searchResolved);
        worker.respond({type: 'search-result', requestId: searchMessage.requestId, data: ['new test chrome']});
        await searchPromise;
        assert.isTrue(searchModule.checkSearchResultExits('new test chrome'));
    });

    it('should rerun the current filter after patching the search index', async () => {
        const initPromise = searchModule.initSearch(mkTree_());
        const worker = workers[0];
        worker.respond({type: 'ready', requestId: worker.messages[0].requestId});
        await initPromise;

        const dispatch = sinon.stub();
        const refreshPromise = searchModule.refreshSearch(
            mkTree_(),
            mkPatch_(),
            () => ({text: 'renamed', matchCase: false, useRegexFilter: false}),
            dispatch
        );
        const patchMessage = worker.messages.at(-1);
        worker.respond({type: 'patched', requestId: patchMessage.requestId});
        await Promise.resolve();
        const searchMessage = worker.messages.at(-1);

        assert.equal(searchMessage.type, 'search');
        assert.equal(searchMessage.data.text, 'renamed');
        worker.respond({type: 'search-result', requestId: searchMessage.requestId, data: ['renamed chrome']});
        await refreshPromise;
        assert.isTrue(searchModule.checkSearchResultExits('renamed chrome'));
    });
});
