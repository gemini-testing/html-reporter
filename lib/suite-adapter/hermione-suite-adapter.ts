'use strict';

// @ts-ignore
const _ = require('lodash');
const path = require('path');
const url = require('url');
// @ts-ignore
const SuiteAdapter = require('./suite-adapter');
const {getSuitePath} = require('../plugin-utils').getHermioneUtils();

module.exports = class HermioneSuiteAdapter extends SuiteAdapter {
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

    getUrl(opts: any = {}) {
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

function getSkipComment(suite: any): any {
    return suite.skipReason || suite.parent && getSkipComment(suite.parent);
}
