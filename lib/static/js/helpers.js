'use strict';

/**
 * querySelector wrapper
 *
 * @param {string} selector Selector to query
 * @param {Element} [scope] Optional scope element for the selector
 */
export function querySelector(selector, scope = document) {
    return scope.querySelector(selector);
}

/**
 * querySelectorAll wrapper
 *
 * @param {string} selector Selector to query
 * @param {Element} [scope=document] Optional scope element for the selector
 */
export function querySelectorAll(selector, scope = document) {
    return scope.querySelectorAll(selector);
}

/**
 * getElementById wrapper
 *
 * @param {string} selector Selector to query
 * @param {Element} [scope=document] Optional scope element for the selector
 */
export function $byId(selector, scope = document) {
    return scope.getElementById(selector);
}

/**
 * addEventListener wrapper
 *
 * @param {Element|Window} target - Target Element
 * @param {string} type - Event name to bind to
 * @param {Function} callback - Event callback
 * @param {boolean} [capture] - Capture the event
 */
export function $on(target, type, callback, capture) {
    target.addEventListener(type, callback, Boolean(capture));
}
