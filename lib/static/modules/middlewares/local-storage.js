import * as localStorageWrapper from '../local-storage-wrapper';
import actionNames from '../action-names';

export default store => next => action => {
    const result = next(action);

    if (shouldUpdateLocalStorage(action.type)) {
        const {view, app} = store.getState();
        // do not save text inputs:
        // for example, a user opens a new report and sees no tests in it
        // as the filter is applied from the previous opening of another report
        localStorageWrapper.setItem('view', {
            expand: view.expand,
            diffMode: view.diffMode,
            strictMatchFilter: view.strictMatchFilter
        });

        localStorageWrapper.setItem('app.suitesPage.viewMode', app.suitesPage.viewMode);
        localStorageWrapper.setItem('app.visualChecksPage.viewMode', app.visualChecksPage.viewMode);
        localStorageWrapper.setItem('app.visualChecksPage.diffMode', app.visualChecksPage.diffMode);
    }

    return result;
};

function shouldUpdateLocalStorage(actionType) {
    return /^VIEW_/.test(actionType)
        || [
            actionNames.INIT_GUI_REPORT,
            actionNames.INIT_STATIC_REPORT,
            actionNames.CHANGE_VIEW_MODE,
            actionNames.SET_DIFF_MODE,
            actionNames.VISUAL_CHECKS_SET_DIFF_MODE
        ].includes(actionType);
}
