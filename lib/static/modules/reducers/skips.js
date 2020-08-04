import actionNames from '../action-names';

export default (state, action) => {
    switch (action.type) {
        case actionNames.INIT_GUI_REPORT:
        case actionNames.INIT_STATIC_REPORT: {
            const {skips} = action.payload;

            return {...state, skips};
        }

        default:
            return state;
    }
};
