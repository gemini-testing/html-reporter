'use strict';

const _ = require('lodash');
const path = require('path');
const url = require('url');
const Uri = require('urijs');

const {getSuitePath} = require('./plugin-utils').getHermioneUtils();

const wrapLinkByTag = (text) => {
    return text.replace(/https?:\/\/[^\s]*/g, (url) => {
        return `<a target="_blank" href="${url}">${url}</a>`;
    });
};

function getSkipComment(suite) {
    return suite.skipReason || suite.parent && getSkipComment(suite.parent);
}

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

    get skipComment() {
        const skipComment = getSkipComment(this._suite);

        return this._wrapSkipComment(skipComment);
    }

    get fullName() {
        return this._suite.fullTitle();
    }

    get path() {
        return getSuitePath(this._suite.parent);
    }

    get file() {
        return path.relative(process.cwd(), this._suite.file);
    }

    getUrl(opts = {}) {
        const url = _.get(this, '_suite.meta.url', '');

        return this._configureUrl(url, opts.baseHost);
    }

    get fullUrl() {
        const baseUrl = this.getUrl();

        return baseUrl
            ? url.parse(baseUrl).path
            : '';
    }
};
