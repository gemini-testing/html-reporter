import {get, isPlainObject, isUndefined} from 'lodash';
import {State} from '@/static/new-ui/types/store';
import {DeepPartial} from 'redux';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function copyAndMerge(state: any, diff: any): unknown {
    const result = {...state};

    for (const key in diff) {
        if (isPlainObject(diff[key]) && isPlainObject(state[key])) {
            result[key] = copyAndMerge(state[key], diff[key]);
        } else if (diff[key] !== undefined) {
            result[key] = diff[key];
        } else {
            delete result[key];
        }
    }

    return result;
}

/**
 * Create new state from old state and diff object
 */
export const applyStateUpdate = (state: State, diff: DeepPartial<State>): State => copyAndMerge(state, diff) as State;

/**
 * Ensure diff has an object by given path
 * Usually it is being used to pass nested diff property to a helper function
 */
export function ensureDiffProperty(diff: object, path: string[]): void {
    let state = diff as Record<string, unknown>;

    for (let i = 0; i < path.length; i++) {
        const property = path[i];

        state[property] = state[property] || {};

        state = state[property] as Record<string, unknown>;
    }
}

/**
 * @returns Result of _.get(diff, path) if it exists, _.get(state, path) otherwise
 */
export function getUpdatedProperty(state: State, diff: State, path: string[]): unknown {
    const diffValue = get(diff, path);

    return isUndefined(diffValue) ? get(state, path) : diffValue;
}
