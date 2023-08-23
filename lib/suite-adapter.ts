import _ from 'lodash';
import path from 'path';
import url from 'url';
import Uri from 'urijs';
import {getSuitePath} from './plugin-utils';
import {Suite, TestResult} from './types';

const wrapLinkByTag = (text: string): string => {
    return text.replace(/https?:\/\/[^\s]*/g, (url) => {
        return `<a target="_blank" href="${url}">${url}</a>`;
    });
};

function getSkipComment(suite: TestResult | Suite): string | null | undefined {
    return suite.skipReason || suite.parent && getSkipComment(suite.parent);
}

export class SuiteAdapter {
    protected _suite: TestResult;

    static create(suite: TestResult): SuiteAdapter {
        return new this(suite);
    }

    constructor(suite: TestResult) {
        this._suite = suite;
    }

    protected _wrapSkipComment(skipComment: string | null | undefined): string {
        return skipComment ? wrapLinkByTag(skipComment) : 'Unknown reason';
    }

    protected _configureUrl(url: string, baseHost: string): string {
        return _.isEmpty(baseHost)
            ? url
            : Uri(baseHost).resource(url).href();
    }

    get skipComment(): string {
        const skipComment = getSkipComment(this._suite);

        return this._wrapSkipComment(skipComment);
    }

    get fullName(): string {
        return this._suite.fullTitle();
    }

    get path(): string[] {
        return getSuitePath(this._suite.parent);
    }

    get file(): string {
        return path.relative(process.cwd(), this._suite.file);
    }

    getUrl(opts: { baseHost?: string } = {}): string {
        const url = _.get(this, '_suite.meta.url', '') as string;

        return this._configureUrl(url, opts.baseHost || '');
    }

    get fullUrl(): string {
        const baseUrl = this.getUrl();

        return baseUrl
            ? url.parse(baseUrl).path || ''
            : '';
    }
}
