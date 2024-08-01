import actionNames from '../action-names';

export default (state, action) => {
    switch (action.type) {
        case actionNames.SUITES_PAGE_UPDATE_LIST:
            return {...state, suitesPage: {...state.suitesPage, list: action.payload.list}};
        default:
            return state;
    }
};
