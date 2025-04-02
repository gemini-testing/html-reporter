const reducer = require('lib/static/modules/reducers/modals').default;
const actionNames = require('lib/static/modules/action-names').default;
const defaultState = require('lib/static/modules/default-state').default;

describe('lib/static/modules/reducers/modals', () => {
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
