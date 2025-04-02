const reducer = require('lib/static/modules/reducers/bottom-progress-bar').default;
const actionNames = require('lib/static/modules/action-names').default;

describe('lib/static/modules/reducers/bottom-progress-bar', () => {
    it('should update "currentRootSuiteId"', () => {
        const action = {type: actionNames.UPDATE_BOTTOM_PROGRESS_BAR, payload: {currentRootSuiteId: 'some-id'}};
        const newState = reducer({}, action);

        assert.deepEqual(newState, {
            progressBar: {
                currentRootSuiteId: 'some-id'
            }
        });
    });

    it('should return passed state if action has not been handled', () => {
        const action = {type: 'non-existing-action-name'};
        const newState = reducer({some: 'data'}, action);

        assert.deepEqual(newState, {
            some: 'data'
        });
    });
});
