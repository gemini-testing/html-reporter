import * as localStorageWrapper from '../local-storage-wrapper';
import actionNames from '../action-names';
import {SUITES_PAGE_DIFF_MODE_KEY, VISUAL_CHECKS_PAGE_DIFF_MODE_KEY} from '../../../constants/local-storage';

export default store => next => action => {
    const result = next(action);

    if (shouldUpdateLocalStorage(action.type)) {
        const {view, app} = store.getState();
        // do not save text inputs:
        // for example, a user opens a new report and sees no tests in it
        // as the filter is applied from the previous opening of another report
        localStorageWrapper.setItem('view', {
            expand: view.expand,
            strictMatchFilter: view.strictMatchFilter
        });

        if (action.type === actionNames.SET_DIFF_MODE) {
            localStorageWrapper.setItem(SUITES_PAGE_DIFF_MODE_KEY, action.payload.diffModeId);
        }
        if (action.type === actionNames.VISUAL_CHECKS_SET_DIFF_MODE) {
            localStorageWrapper.setItem(VISUAL_CHECKS_PAGE_DIFF_MODE_KEY, action.payload.diffModeId);
        }
        localStorageWrapper.setItem('app.suitesPage.viewMode', app.suitesPage.viewMode);
        localStorageWrapper.setItem('app.visualChecksPage.viewMode', app.visualChecksPage.viewMode);
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
