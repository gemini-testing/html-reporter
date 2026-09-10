const reducer = require('lib/static/modules/reducers').default;
const actionNames = require('lib/static/modules/action-names').default;
const defaultState = require('lib/static/modules/default-state').default;
const {mkSuite, mkBrowser, mkResult, mkStateTree} = require('../../state-utils');
const {RunTestsFeature, EditScreensFeature} = require('lib/constants');

describe('lib/static/modules/reducers', () => {
    it('should allow queuing from the cache and preserve the pending run and filter when updating', () => {
        const makePayload = isCached => ({
            isCached,
            tree: mkStateTree({
                suitesById: mkSuite({id: 'suite', browserIds: ['browser']}),
                browsersById: mkBrowser({id: 'browser', parentId: 'suite', resultIds: ['result']}),
                resultsById: mkResult({id: 'result', parentId: 'browser'})
            }),
            config: {...defaultState.config, errorPatterns: []},
            skips: [], features: [], apiValues: {}, db: null, isNewUi: true
        });
        let state = reducer(undefined, {type: actionNames.INIT_GUI_REPORT, payload: makePayload(true)});
        assert.isFalse(state.processing);
        assert.isTrue(state.app.isGuiInitializing);
        assert.deepEqual(state.app.availableFeatures, [RunTestsFeature]);
        const queuedTestRun = {tests: [{testName: 'test', browserName: 'browser'}], repeatCount: 2};
        state = reducer(state, {type: actionNames.QUEUE_TEST_RUN, payload: queuedTestRun});
        assert.isTrue(state.running);
        assert.isTrue(state.processing);
        state = reducer(state, {type: actionNames.VIEW_UPDATE_FILTER_BY_NAME, payload: {data: 'my test'}});
        state = reducer(state, {
            type: actionNames.INIT_GUI_REPORT,
            payload: {...makePayload(false), preserveUiState: true}
        });
        assert.isTrue(state.processing);
        assert.isTrue(state.running);
        assert.isFalse(state.app.isGuiInitializing);
        assert.deepEqual(state.app.queuedTestRun, queuedTestRun);
        assert.includeDeepMembers(state.app.availableFeatures, [RunTestsFeature, EditScreensFeature]);
        assert.equal(state.app.nameFilter, 'my test');
        state = reducer(state, {type: actionNames.CLEAR_QUEUED_TEST_RUN});
        assert.isFalse(state.running);
        assert.isFalse(state.processing);
        assert.isNull(state.app.queuedTestRun);
    });

    describe('static accepter editing while processing', () => {
        [
            actionNames.STATIC_ACCEPTER_DELAY_SCREENSHOT,
            actionNames.STATIC_ACCEPTER_UNDO_DELAY_SCREENSHOT,
            actionNames.STATIC_ACCEPTER_STAGE_SCREENSHOT,
            actionNames.STATIC_ACCEPTER_UNSTAGE_SCREENSHOT
        ].forEach((type) => {
            it(`should ignore ${type}`, () => {
                const state = {processing: true};

                const newState = reducer(state, {type, payload: ['image-id']});

                assert.strictEqual(newState, state);
            });
            it(`should ignore ${type} while the cached tree is shown`, () => {
                const state = {processing: false, app: {isGuiInitializing: true}};
                assert.strictEqual(reducer(state, {type, payload: ['image-id']}), state);
            });
        });

        it('should resume editing after processing ends', () => {
            const state = {...defaultState, processing: false};
            const image = {imageId: 'image-id', stateName: 'plain', stateNameImageId: 'state-image-id'};

            const newState = reducer(state, {
                type: actionNames.STATIC_ACCEPTER_DELAY_SCREENSHOT,
                payload: [image]
            });

            assert.deepEqual(newState.staticImageAccepter.accepterDelayedImages, [image]);
        });
    });
});
