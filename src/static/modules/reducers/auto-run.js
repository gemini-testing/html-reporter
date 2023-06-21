import actionNames from '../action-names';

export default (state, action) => {
    switch (action.type) {
        case actionNames.INIT_GUI_REPORT: {
            const {autoRun = false} = action.payload;

            return {...state, autoRun};
        }

        default:
            return state;
    }
};
