import {get, set} from 'lodash';
import {EXPAND_ALL, EXPAND_ERRORS, EXPAND_RETRIES} from '../../../../constants/expand-modes';
import {getUpdatedProperty} from '../../utils';

export function changeNodeState(nodesStateById, nodeId, state, diff = nodesStateById) {
    Object.keys(state).forEach((stateName) => {
        const prevStateValue = get(nodesStateById[nodeId], stateName);

        if (prevStateValue !== state[stateName]) {
            set(diff, [nodeId, stateName], state[stateName]);
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

export function getShownCheckedChildCount(tree, suiteId, diff = tree) {
    const {suiteIds = [], browserIds = []} = tree.suites.byId[suiteId];
    const checkedChildBrowserCount = browserIds.reduce((sum, browserChildId) => {
        const shouldBeShown = getUpdatedProperty(tree, diff, ['browsers', 'stateById', browserChildId, 'shouldBeShown']);
        const checkStatus = getUpdatedProperty(tree, diff, ['browsers', 'stateById', browserChildId, 'checkStatus']);

        return sum + (shouldBeShown && checkStatus);
    }, 0);
    const checkedChildSuitesCount = suiteIds.reduce((sum, suiteChildId) => {
        const shouldBeShown = getUpdatedProperty(tree, diff, ['suites', 'stateById', suiteChildId, 'shouldBeShown']);
        const checkStatus = getUpdatedProperty(tree, diff, ['suites', 'stateById', suiteChildId, 'checkStatus']);

        return sum + (shouldBeShown && checkStatus);
    }, 0);

    return checkedChildBrowserCount + checkedChildSuitesCount;
}
