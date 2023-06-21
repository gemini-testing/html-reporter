import actionNames from '../action-names';

export default (state, action) => {
    switch (action.type) {
        case actionNames.INIT_GUI_REPORT: {
            return {...state, gui: true};
        }

        case actionNames.INIT_STATIC_REPORT: {
            return {...state, gui: false};
        }

        default:
            return state;
    }
};
