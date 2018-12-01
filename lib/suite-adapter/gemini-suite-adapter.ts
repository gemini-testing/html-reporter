'use strict';

// @ts-ignore
const SuiteAdapter = require('./suite-adapter');

module.exports = class GeminiSuiteAdapter extends SuiteAdapter {
    get skipComment() {
        return this._wrapSkipComment(this._suite.skipComment);
    }

    getUrl(opts: any = {}) {
        const browserConfig = this._config.forBrowser(opts.browserId);
        const url = browserConfig.getAbsoluteUrl(this._suite.url);

        return super._configureUrl(url, opts.baseHost);
    }

    get fullUrl() {
        return this._suite.fullUrl;
    }

    get path() {
        return this._suite.path;
    }

    get file() {
        return this._suite.file;
    }

    get fullName() {
        return this._suite.fullName;
    }
};
