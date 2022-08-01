import {changeNodeState} from '../helpers';

export function initResultsState(tree) {
    changeAllResultsState(tree, {matchedSelectedGroup: false});
}

export function changeAllResultsState(tree, state) {
    tree.results.allIds.forEach((resultId) => {
        changeResultState(tree, resultId, state);
    });
}

export function changeResultState(tree, resultId, state) {
    changeNodeState(tree.results.stateById, resultId, state);
}

export function addResult(tree, result) {
    tree.results.byId[result.id] = result;

    if (!tree.results.allIds.includes(result.id)) {
        tree.results.allIds.push(result.id);
    }

    const browserId = result.parentId;

    if (!tree.browsers.byId[browserId].resultIds.includes(result.id)) {
        tree.browsers.byId[browserId].resultIds.push(result.id);
    }
}
