'use strict';

const {isNumber, isFunction} = require('lodash');

const REACH_GOAL = 'reachGoal';
const PARAMS = 'params';
const targets = {
    ACCEPT_SCREENSHOT: 'ACCEPT_SCREENSHOT',
    ACCEPT_OPENED_SCREENSHOTS: 'ACCEPT_OPENED_SCREENSHOTS'
};

module.exports = class YandexMetrika {
    static create(config) {
        return new this(config);
    }

    constructor(config) {
        this._config = config;
    }

    _isEnabled() {
        return isNumber(this._config.counterNumber) && window.ym && isFunction(window.ym);
    }

    _register(cb) {
        if (!this._isEnabled()) {
            return;
        }

        cb();
    }

    _registerGoal(target, goalParams = {}) {
        this._register(() => window.ym(this._config.counterNumber, REACH_GOAL, target, goalParams));
    }

    sendVisitParams(params) {
        this._register(() => {
            window.ym(this._config.counterNumber, PARAMS, params);
        });
    }

    acceptScreenshot(params = {acceptedImagesCount: 1}) {
        this._registerGoal(targets.ACCEPT_SCREENSHOT, params);
    }

    acceptOpenedScreenshots(params) {
        this._registerGoal(targets.ACCEPT_OPENED_SCREENSHOTS, params);
    }
};
