import {isEmpty, last, initial} from 'lodash';
import {isBrowserMatchViewMode, isTestNameMatchFilters, shouldShowBrowser} from '../../../utils';
import {isNodeFailed} from '../../../utils';
import {changeNodeState, shouldNodeBeOpened} from '../helpers';

export function initBrowsersState(tree, view) {
    tree.browsers.allIds.forEach((browserId) => {
        setBrowsersLastRetry(tree, browserId);

        if (view.keyToGroupTestsBy) {
            changeBrowserState(tree, browserId, {shouldBeShown: false});
        } else {
            calcBrowsersShowness(tree, view, browserId);
        }

        calcBrowsersOpenness(tree, view.expand, browserId);
    });
}

export function changeAllBrowsersState(tree, state) {
    tree.browsers.allIds.forEach((browserId) => {
        changeBrowserState(tree, browserId, state);
    });
}

export function changeBrowserState(tree, browserId, state) {
    changeNodeState(tree.browsers.stateById, browserId, state);
}

export function setBrowsersLastRetry(tree, browserIds) {
    if (isEmpty(browserIds)) {
        browserIds = tree.browsers.allIds;
    }

    [].concat(browserIds).forEach((browserId) => {
        const retryIndex = getLastRetryIndex(tree, browserId);
        changeBrowserState(tree, browserId, {retryIndex});
    });
}

export function calcBrowsersShowness(tree, view, browserIds) {
    if (isEmpty(browserIds)) {
        browserIds = tree.browsers.allIds;
    }

    [].concat(browserIds).forEach((browserId) => {
        const browser = tree.browsers.byId[browserId];
        const lastResult = tree.results.byId[last(browser.resultIds)];
        const shouldBeShown = calcBrowserShowness(browser, lastResult, view);

        changeBrowserState(tree, browserId, {shouldBeShown});
    });
}

export function calcBrowsersOpenness(tree, expand, browserIds) {
    if (isEmpty(browserIds)) {
        browserIds = tree.browsers.allIds;
    }

    [].concat(browserIds).forEach((browserId) => {
        const browser = tree.browsers.byId[browserId];
        const lastResult = tree.results.byId[last(browser.resultIds)];
        const shouldBeOpened = calcBrowserOpenness(browser, lastResult, expand, tree);

        changeBrowserState(tree, browserId, {shouldBeOpened});
    });
}

function getLastRetryIndex(tree, browserId) {
    return tree.browsers.byId[browserId].resultIds.length - 1;
}

function calcBrowserOpenness(browser, lastResult, expand, tree) {
    const errorsCb = () => isNodeFailed(lastResult);
    const retriesCb = () => {
        const retries = [].concat(initial(browser.resultIds)).map((resultId) => tree.results.byId[resultId]);

        return retries.some((retry) => isNodeFailed(retry));
    };

    return shouldNodeBeOpened(expand, {errorsCb, retriesCb});
}

function calcBrowserShowness(browser, lastResult, view) {
    const {viewMode, filteredBrowsers, testNameFilter, strictMatchFilter} = view;

    if (!isBrowserMatchViewMode(browser, lastResult, viewMode)) {
        return false;
    }

    const testName = browser.parentId;

    if (!isTestNameMatchFilters(testName, testNameFilter, strictMatchFilter)) {
        return false;
    }

    return shouldShowBrowser(browser, filteredBrowsers);
}
