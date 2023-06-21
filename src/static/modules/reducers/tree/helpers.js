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
