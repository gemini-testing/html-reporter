'use strict';

module.exports = class HtmlReporter {
    constructor() {
        this._values = {
            extraItems: {},
            metaInfoExtenders: {}
        };
    }

    addExtraItem(key, value) {
        this._values.extraItems[key] = value;
    }

    get extraItems() {
        return this._values.extraItems;
    }

    addMetaInfoExtender(key, value) {
        this._values.metaInfoExtenders[key] = value;
    }

    get metaInfoExtenders() {
        return this._values.metaInfoExtenders;
    }

    get values() {
        return this._values;
    }
};
