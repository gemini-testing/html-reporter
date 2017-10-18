/* global _ */

'use strict';

import {hasFails} from './utils';

export default class Store {
    constructor(data) {
        this.data = data;
    }

    getAllData() {
        return this.data;
    }

    getErrorSuites() {
        if (!this.errorSuites) {
            this._setErrorSuites();
        }

        return this.errorSuites;
    }

    _setErrorSuites() {
        this.errorSuites = _(this.data.suites)
            .cloneDeep()
            .filter(hasFails);
    }
}
