'use strict';

const _prefix = 'html-reporter';

/**
 * Format Storage key
 * @param key
 * @returns {string}
 * @private
 */
function _getStorageKey(key) {
    return `${_prefix}:${key}`;
}

/**
 * Wrap localStorage#setItem method
 * Support value serialization
 * @param key
 * @param value
 */
export function setItem(key, value) {
    window.localStorage.setItem(_getStorageKey(key), JSON.stringify(value));
}

/**
 * Wrap localStorage#getItem method
 * Parse deserialize storage value
 * If key doesn't exist in storage return defaultValue
 * @param key
 * @param defaultValue
 * @returns {object|string}
 */
export function getItem(key, defaultValue) {
    if (!hasItem(key)) {
        return defaultValue;
    }

    const item = window.localStorage.getItem(_getStorageKey(key));

    try {
        return JSON.parse(item);
    } catch (e) {
        return item;
    }
}

/**
 * Checks whether the key is contained in storage.
 * @param key
 * @returns {boolean}
 */
export function hasItem(key) {
    return window.localStorage.hasOwnProperty(_getStorageKey(key));
}
