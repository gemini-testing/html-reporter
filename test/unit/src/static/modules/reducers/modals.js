import reducer from 'src/static/modules/reducers/modals';
import actionNames from 'src/static/modules/action-names';
import defaultState from 'src/static/modules/default-state';

describe('src/static/modules/reducers/modals', () => {
    describe(`"${actionNames.OPEN_MODAL}" action`, () => {
        it('should add modal', () => {
            const action = {type: actionNames.OPEN_MODAL, payload: {id: 'first'}};

            const newState = reducer(defaultState, action);

            assert.deepEqual(newState.modals, [{id: 'first'}]);
        });

        it('should add few modals in correct order', () => {
            const action1 = {type: actionNames.OPEN_MODAL, payload: {id: 'first'}};
            const action2 = {type: actionNames.OPEN_MODAL, payload: {id: 'second'}};

            const newState1 = reducer(defaultState, action1);
            const newState2 = reducer(newState1, action2);

            assert.deepEqual(newState2.modals, [{id: 'first'}, {id: 'second'}]);
        });
    });

    describe(`"${actionNames.CLOSE_MODAL}" action`, () => {
        it('should remove modal with the same "id"', () => {
            const action = {type: actionNames.CLOSE_MODAL, payload: {id: 'second'}};
            const modals = [{id: 'first'}, {id: 'second'}, {id: 'third'}];

            const newState = reducer({...defaultState, modals}, action);

            assert.deepEqual(newState.modals, [{id: 'first'}, {id: 'third'}]);
        });
    });
});
