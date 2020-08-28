import actionNames from '../action-names';

export default (state, action) => {
    switch (action.type) {
        case actionNames.INIT_STATIC_REPORT: {
            const {fetchDbDetails} = action.payload;
            return {...state, fetchDbDetails};
        }

        default:
            return state;
    }
};
