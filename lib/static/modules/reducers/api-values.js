import actionNames from '../action-names';

export default (state, action) => {
    switch (action.type) {
        case actionNames.INIT_GUI_REPORT:
        case actionNames.INIT_STATIC_REPORT: {
            const {apiValues} = action.payload;

            return applyChanges(state, apiValues);
        }

        default:
            return state;
    }
};

function applyChanges(state, apiValues) {
    return {
        ...state,
        apiValues: {
            ...state.apiValues,
            ...apiValues
        }
    };
}
