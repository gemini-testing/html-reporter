import {isEmpty, last, initial} from 'lodash';
import {isBrowserMatchViewMode, matchTestName, shouldShowBrowser} from '../../../utils';
import {ensureDiffProperty, getUpdatedProperty} from '../../../utils/state';
import {UNCHECKED} from '../../../../../constants/checked-statuses';
import {isNodeFailed} from '../../../utils';
import {changeNodeState, shouldNodeBeOpened} from '../helpers';

export function initBrowsersState(tree, view, app = {}) {
    tree.browsers.allIds.forEach((browserId) => {
        setBrowsersLastRetry(tree, browserId);
        changeBrowserState(tree, browserId, {checkStatus: UNCHECKED});

        if (view.keyToGroupTestsBy) {
            changeBrowserState(tree, browserId, {shouldBeShown: false});
        } else {
            calcBrowsersShowness({tree, view, app, browserIds: [browserId]});
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

export function calcBrowsersShowness({tree, view, app = {}, browserIds = [], diff = tree}) {
    ensureDiffProperty(diff, ['browsers', 'byId']);
    if (isEmpty(browserIds)) {
        browserIds = tree.browsers.allIds;
    }

    const {viewMode, filteredBrowsers, testNameFilter, useMatchCaseFilter, useRegexFilter, strictMatchFilter} = view;
    const {isNewUi = false} = app;

    browserIds.forEach((browserId) => {
        ensureDiffProperty(diff.browsers.byId, [browserId]);
        const browser = tree.browsers.byId[browserId];
        const diffBrowser = diff.browsers.byId[browserId];
        const testName = getUpdatedProperty(browser, diffBrowser, 'parentId');

        const lastResultId = last(getUpdatedProperty(browser, diffBrowser, 'resultIds'));
        const lastResultStatus = getUpdatedProperty(tree, diff, ['results', 'byId', lastResultId, 'status']);

        // Computing browser's shouldBeShown status
        let shouldBeShown = true;
        let isHiddenBecauseOfStatus = false;
        const testNameMatch = matchTestName(testName, browser.name, testNameFilter, {strictMatchFilter, useMatchCaseFilter, useRegexFilter, isNewUi});
        if (!shouldShowBrowser(browser, filteredBrowsers, diff)) {
            shouldBeShown = false;
        } else if (!isBrowserMatchViewMode(browser, lastResultStatus, viewMode, diff)) {
            shouldBeShown = false;
            isHiddenBecauseOfStatus = true;
        } else if (!testNameMatch.isMatch) {
            shouldBeShown = false;
        }

        // Computing browser's checkStatus
        const checkStatus = shouldBeShown ? tree.browsers.stateById[browserId].checkStatus : UNCHECKED;

        changeBrowserState(tree, browserId, {shouldBeShown, isHiddenBecauseOfStatus, checkStatus, fuzzyMatchScore: testNameMatch.score}, diff);
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
