import * as localStorageWrapper from '../local-storage-wrapper';
import actionNames from '../action-names';

export default store => next => action => {
    const result = next(action);

    if (shouldUpdateLocalStorage(action.type)) {
        const {view} = store.getState();
        // do not save text inputs:
        // for example, a user opens a new report and sees no tests in it
        // as the filter is applied from the previous opening of another report
        localStorageWrapper.setItem('view', {
            expand: view.expand,
            viewMode: view.viewMode,
            diffMode: view.diffMode,
            strictMatchFilter: view.strictMatchFilter
        });
    }

    return result;
};

function shouldUpdateLocalStorage(actionType) {
    return /^VIEW_/.test(actionType)
        || [actionNames.INIT_GUI_REPORT, actionNames.INIT_STATIC_REPORT].includes(actionType);
}
