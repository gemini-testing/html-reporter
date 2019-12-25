'use strict';

const _prefix = 'html-reporter';
const _deprecatedKeysCollection = [
    {deprecatedKey: '_gemini-replace-host', newKey: _getStorageKey('replace-host')}
];

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
 * Helping to migrate on new storage keys
 *  @private
 */
export function updateDeprecatedKeys() {
    _deprecatedKeysCollection.forEach(({deprecatedKey, newKey}) => {
        if (window.localStorage.hasOwnProperty(deprecatedKey)) {
            window.localStorage.setItem(newKey, JSON.stringify(window.localStorage.getItem(deprecatedKey)));
            window.localStorage.removeItem(deprecatedKey);
        }
    });
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
