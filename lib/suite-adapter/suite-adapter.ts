'use strict';

// @ts-ignore
const _ = require('lodash');
const Uri = require('urijs');

function wrapLinkByTag(text: string): string {
    return text.replace(/https?:\/\/[^\s]*/g, (url: string) =>
        `<a target="_blank" href="${url}">${url}</a>`
    );
}

module.exports = class SuiteAdapter {
    static create(suite = {}, config = {}) {
        return new this(suite, config);
    }

    constructor(
        protected _suite: any,
        protected _config: any
    ) {
        // console.log(_suite, _config);
    }

    protected _wrapSkipComment(skipComment: string) {
        return skipComment ? wrapLinkByTag(skipComment) : 'Unknown reason';
    }

    protected _configureUrl(url: string, baseHost: string) {
        return _.isEmpty(baseHost)
            ? url
            : Uri(baseHost).resource(url).href();
    }
};
