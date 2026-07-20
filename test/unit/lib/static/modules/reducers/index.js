const reducer = require('lib/static/modules/reducers').default;
const actionNames = require('lib/static/modules/action-names').default;
const defaultState = require('lib/static/modules/default-state').default;

describe('lib/static/modules/reducers', () => {
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
