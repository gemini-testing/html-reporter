/* global _ */

'use strict';

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
            .map((suite) => {
                suite.children = _(suite.children)
                    .map((state) => {
                        state.browsers = _.filter(state.browsers, (stateInBro) => stateInBro.result && (stateInBro.result.error || stateInBro.result.fail));
                        return state;
                    })
                    .filter((state) => state.browsers.length)
                    .value();

                return suite;
            })
            .filter((suite) => suite.children.length);
    }
}
