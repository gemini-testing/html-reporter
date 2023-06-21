import {changeNodeState} from '../helpers';
import {removeResultFromBrowsers} from './browsers';
import {removeImages} from './images';

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
    const browserId = result.parentId;

    if (!tree.browsers.byId[browserId].resultIds.includes(result.id)) {
        tree.results.allIds.push(result.id);
        tree.browsers.byId[browserId].resultIds.push(result.id);
    }
}

export function removeResult(tree, resultId) {
    const result = tree.results.byId[resultId];

    removeImages(tree, result.imageIds);
    removeResultFromBrowsers(tree, resultId);

    tree.results.allIds = tree.results.allIds.filter(id => id !== resultId);

    delete tree.results.byId[resultId];
    delete tree.results.stateById[resultId];
}
