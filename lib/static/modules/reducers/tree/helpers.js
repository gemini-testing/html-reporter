import {get, set} from 'lodash';
import {EXPAND_ALL, EXPAND_ERRORS, EXPAND_RETRIES} from '../../../../constants/expand-modes';

export function changeNodeState(nodesStateById, nodeId, state) {
    Object.keys(state).forEach((stateName) => {
        const prevStateValue = get(nodesStateById[nodeId], stateName);

        if (prevStateValue !== state[stateName]) {
            set(nodesStateById, [nodeId, stateName], state[stateName]);
        }
    });
}

export function shouldNodeBeOpened(expand, {errorsCb, retriesCb}) {
    if (expand === EXPAND_ERRORS) {
        return errorsCb();
    }

    if (expand === EXPAND_RETRIES) {
        return retriesCb();
    }

    if (expand === EXPAND_ALL) {
        return true;
    }

    return false;
}

export function getShownCheckedChildCount(tree, suiteId) {
    const {suiteIds = [], browserIds = []} = tree.suites.byId[suiteId];
    const checkedChildBrowserCount = browserIds.reduce((sum, browserChildId) => {
        const browserState = tree.browsers.stateById[browserChildId];

        return sum + (browserState.shouldBeShown && browserState.checkStatus);
    }, 0);
    const checkedChildSuitesCount = suiteIds.reduce((sum, suiteChildId) => {
        const suiteState = tree.suites.stateById[suiteChildId];

        return sum + (suiteState.shouldBeShown && suiteState.checkStatus);
    }, 0);

    return checkedChildBrowserCount + checkedChildSuitesCount;
}
