/* global _ */

'use strict';

import {hasFails} from './utils';

export default class Store {
    constructor(data) {
        this._data = data;
        this._config = this._data.config;
    }

    getAllData() {
        return this._data;
    }

    getHeaderData() {
        return _.omit(this.getAllData(), ['suites']);
    }

    getErrorSuites() {
        if (!this.errorSuites) {
            this._setErrorSuites();
        }

        return this.errorSuites;
    }

    get config() {
        return this._config;
    }

    _setErrorSuites() {
        this.errorSuites = _(this._data.suites)
            .cloneDeep()
            .filter(hasFails);
    }
}
