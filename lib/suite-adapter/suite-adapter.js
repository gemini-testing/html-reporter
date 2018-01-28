'use strict';

const _ = require('lodash');
const Uri = require('urijs');

const wrapLinkByTag = (text) => {
    return text.replace(/https?:\/\/[^\s]*/g, (url) => {
        return `<a target="_blank" href="${url}">${url}</a>`;
    });
};

module.exports = class SuiteAdapter {
    static create(suite = {}, config = {}) {
        return new this(suite, config);
    }

    constructor(suite, config) {
        this._suite = suite;
        this._config = config;
    }

    _wrapSkipComment(skipComment) {
        return skipComment ? wrapLinkByTag(skipComment) : 'Unknown reason';
    }

    _configureUrl(url, baseHost) {
        return _.isEmpty(baseHost)
            ? url
            : Uri(baseHost).resource(url).href();
    }
};
