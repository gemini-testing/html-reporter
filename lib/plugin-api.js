'use strict';

module.exports = class HtmlReporter {
    constructor() {
        this._extraItems = {};
    }

    addExtraItem(key, value) {
        this._extraItems[key] = value;
    }

    get extraItems() {
        return this._extraItems;
    }
};
