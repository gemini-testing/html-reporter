import reducer from 'src/static/modules/reducers/bottom-progress-bar';
import actionNames from 'src/static/modules/action-names';

describe('src/static/modules/reducers/bottom-progress-bar', () => {
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
