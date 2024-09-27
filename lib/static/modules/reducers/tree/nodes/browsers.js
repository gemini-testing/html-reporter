import {isEmpty, last, initial} from 'lodash';
import {isBrowserMatchViewMode, isTestNameMatchFilters, shouldShowBrowser} from '../../../utils';
import {ensureDiffProperty, getUpdatedProperty} from '../../../utils/state';
import {UNCHECKED} from '../../../../../constants/checked-statuses';
import {isNodeFailed} from '../../../utils';
import {changeNodeState, shouldNodeBeOpened} from '../helpers';

export function initBrowsersState(tree, view) {
    tree.browsers.allIds.forEach((browserId) => {
        setBrowsersLastRetry(tree, browserId);
        changeBrowserState(tree, browserId, {checkStatus: UNCHECKED});

        if (view.keyToGroupTestsBy) {
            changeBrowserState(tree, browserId, {shouldBeShown: false});
        } else {
            calcBrowsersShowness({tree, view, browserIds: [browserId]});
        }

        calcBrowsersOpenness({tree, expand: view.expand, browserIds: [browserId]});
    });
}

export function getBrowserParentId(tree, browserId) {
    return tree.browsers.byId[browserId].parentId;
}

export function changeAllBrowsersState(tree, state, diff = tree) {
    tree.browsers.allIds.forEach((browserId) => {
        changeBrowserState(tree, browserId, state, diff);
    });
}

export function changeBrowserState(tree, browserId, state, diff = tree) {
    ensureDiffProperty(diff, ['browsers', 'stateById']);

    changeNodeState(tree.browsers.stateById, browserId, state, diff.browsers.stateById);
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

export function calcBrowsersShowness({tree, view, browserIds = [], diff = tree}) {
    ensureDiffProperty(diff, ['browsers', 'byId']);
    if (isEmpty(browserIds)) {
        browserIds = tree.browsers.allIds;
    }

    browserIds.forEach((browserId) => {
        ensureDiffProperty(diff.browsers.byId, [browserId]);
        const browser = tree.browsers.byId[browserId];
        const diffBrowser = diff.browsers.byId[browserId];

        const lastResultId = last(getUpdatedProperty(browser, diffBrowser, 'resultIds'));
        const lastResultStatus = getUpdatedProperty(tree, diff, ['results', 'byId', lastResultId, 'status']);

        const {shouldBeShown, isHiddenBecauseOfStatus} = calcBrowserShowness(browser, lastResultStatus, view, diffBrowser);
        const checkStatus = shouldBeShown ? tree.browsers.stateById[browserId].checkStatus : UNCHECKED;

        changeBrowserState(tree, browserId, {shouldBeShown, isHiddenBecauseOfStatus, checkStatus}, diff);
    });
}

export function calcBrowsersOpenness({tree, expand, browserIds = [], diff = tree}) {
    if (isEmpty(browserIds)) {
        browserIds = tree.browsers.allIds;
    }

    browserIds.forEach((browserId) => {
        const browser = tree.browsers.byId[browserId];
        const lastResult = tree.results.byId[last(browser.resultIds)];
        const shouldBeOpened = calcBrowserOpenness(browser, lastResult, expand, tree);

        changeBrowserState(tree, browserId, {shouldBeOpened}, diff);
    });
}

export function removeResultFromBrowsers(tree, resultId) {
    const result = tree.results.byId[resultId];
    const browser = tree.browsers.byId[result.parentId];

    const {retryIndex} = tree.browsers.stateById[browser.id];

    browser.resultIds = browser.resultIds.filter(id => id !== resultId);

    tree.browsers.stateById[browser.id].retryIndex = Math.min(retryIndex, browser.resultIds.length - 1);
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

function calcBrowserShowness(browser, lastResultStatus, view, diff = browser) {
    const {viewMode, filteredBrowsers, testNameFilter, strictMatchFilter} = view;

    const testName = getUpdatedProperty(browser, diff, 'parentId');

    if (!isTestNameMatchFilters(testName, browser.name, testNameFilter, strictMatchFilter)) {
        return {shouldBeShown: false};
    }

    if (!shouldShowBrowser(browser, filteredBrowsers, diff)) {
        return {shouldBeShown: false};
    }

    if (!isBrowserMatchViewMode(browser, lastResultStatus, viewMode, diff)) {
        return {shouldBeShown: false, isHiddenBecauseOfStatus: true};
    }

    return {shouldBeShown: true};
}
