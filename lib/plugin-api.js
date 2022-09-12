'use strict';

const EventsEmitter2 = require('eventemitter2');
const pluginEvents = require('./constants/plugin-events');
const {downloadDatabases, mergeDatabases, getTestsTreeFromDatabase} = require('./db-utils/server');

module.exports = class HtmlReporter extends EventsEmitter2 {
    static create(config) {
        return new this(config);
    }

    constructor(config) {
        super();

        this._config = config;
        this._values = {
            extraItems: {},
            metaInfoExtenders: {},
            imagesSaver: require('./local-images-saver'),
            reportsSaver: null
        };
    }

    get config() {
        return this._config;
    }

    get events() {
        return pluginEvents;
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

    set imagesSaver(imagesSaver) {
        this._values.imagesSaver = imagesSaver;
    }

    get imagesSaver() {
        return this._values.imagesSaver;
    }

    set reportsSaver(reportsSaver) {
        this._values.reportsSaver = reportsSaver;
    }

    get reportsSaver() {
        return this._values.reportsSaver;
    }

    get values() {
        return this._values;
    }

    downloadDatabases(...args) {
        return downloadDatabases(...args);
    }

    mergeDatabases(...args) {
        return mergeDatabases(...args);
    }

    getTestsTreeFromDatabase(...args) {
        return getTestsTreeFromDatabase(...args);
    }
};
