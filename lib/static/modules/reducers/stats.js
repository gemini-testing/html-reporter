import actionNames from '../action-names';

export default (state, action) => {
    switch (action.type) {
        case actionNames.INIT_STATIC_REPORT: {
            const {stats} = action.payload;
            const {perBrowser, ...restStats} = stats;

            return {
                ...state,
                stats: {
                    all: restStats,
                    perBrowser
                }
            };
        }

        default:
            return state;
    }
};
