import actionNames from '../action-names';

export default (state, action) => {
    switch (action.type) {
        case actionNames.INIT_GUI_REPORT:
        case actionNames.INIT_STATIC_REPORT:
            return {...state, app: {...state.app, isInitialized: true}};

        default:
            return state;
    }
};
