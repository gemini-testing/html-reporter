'use strict';

const _ = require('lodash');
const path = require('path');
const url = require('url');
const SuiteAdapter = require('./suite-adapter');

module.exports = class HermioneSuiteAdapter extends SuiteAdapter {
    get skipComment() {
        const skipComment = getSkipComment(this._suite);

        return this._wrapSkipComment(skipComment);
    }

    get fullName() {
        return this._suite.fullTitle();
    }

    get path() {
        return getFullPath(this._suite.parent).reverse();
    }

    get file() {
        return path.relative(process.cwd(), this._suite.file);
    }

    getUrl(opts = {}) {
        const url = _.get(this, '_suite.meta.url', '');

        return super._configureUrl(url, opts.baseHost);
    }

    get fullUrl() {
        const baseUrl = this.getUrl();

        return baseUrl
            ? url.parse(baseUrl).path
            : '';
    }
};

function getFullPath(suite) {
    return suite.root ? [] : [suite.title].concat(getFullPath(suite.parent));
}

function getSkipComment(suite) {
    return suite.skipReason || suite.parent && getSkipComment(suite.parent);
}
