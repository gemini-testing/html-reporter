import _ from 'lodash';

import path from 'path';
import url from 'url';

import {SuiteAdapter} from './suite-adapter';
import {ISuite} from 'typings/suite-adapter';

import {getHermioneUtils} from '../plugin-utils';
const {getSuitePath} = getHermioneUtils();

import {IOptions} from 'typings/options';

export default class HermioneSuiteAdapter extends SuiteAdapter {
    static create(suite: ISuite, config = {}): HermioneSuiteAdapter {
        return new this(suite, config);
    }

    constructor(
        protected _suite: ISuite,
        protected _config: IOptions = {}
    ) {
        super(_suite, _config);
    }

    get skipComment() {
        const skipComment = getSkipComment(this._suite);

        return this._wrapSkipComment(skipComment);
    }

    get fullName(): string | undefined {
        return this._suite.fullTitle && this._suite.fullTitle();
    }

    get path(): string[] {
        // TODO: create typings for that func, and delete "as"
        return (getSuitePath as any)(this._suite.parent);
    }

    get file(): string {
        return path.relative(process.cwd(), this._suite.file || '');
    }

    getUrl(opts: IOptions = {}): string {
        const url = _.get(this, '_suite.meta.url', '');

        return super._configureUrl(url, opts.baseHost || '');
    }

    get fullUrl(): string {
        const baseUrl = this.getUrl();

        return baseUrl
            ? url.parse(baseUrl).path as string
            : '';
    }
}

function getSkipComment(suite: ISuite): string | undefined {
    return suite.skipReason || suite.parent && getSkipComment(suite.parent);
}
