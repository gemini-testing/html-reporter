const {get, isPlainObject, isUndefined} = require('lodash');

/**
 * Create new state from old state and diff object
 * @param {Object} state
 * @param {Object} diff
 * @returns {Object} new state, created by overlaying diff to state
 */
function applyStateUpdate(state, diff) {
    const result = {...state};

    for (const key in diff) {
        if (isPlainObject(diff[key]) && isPlainObject(state[key])) {
            result[key] = applyStateUpdate(state[key], diff[key]);
        } else if (diff[key] !== undefined) {
            result[key] = diff[key];
        } else {
            delete result[key];
        }
    }

    return result;
}

/**
 * Ensure diff has an object by given path
 * Usually it is being used to pass nested diff property to a helper function
 * @param {Object} diff
 * @param {Array<string>} path
 */
function ensureDiffProperty(diff, path) {
    let state = diff;

    for (let i = 0; i < path.length; i++) {
        const property = path[i];

        state[property] = state[property] || {};

        state = state[property];
    }
}

/**
 *
 * @param {Object} state
 * @param {Object} diff
 * @param {string|Array<string>} path - in _.get style
 * @returns result of _.get(diff, path) if exists, _.get(state, path) else
 */
function getUpdatedProperty(state, diff, path) {
    const diffValue = get(diff, path);

    return isUndefined(diffValue) ? get(state, path) : diffValue;
}

module.exports = {
    applyStateUpdate,
    ensureDiffProperty,
    getUpdatedProperty
};
