import _ from 'lodash';
import Uri from 'urijs';

import {ISuite} from 'typings/suite-adapter';
import {IOptions} from 'typings/options';

function wrapLinkByTag(text: string): string {
    return text.replace(/https?:\/\/[^\s]*/g, (url: string) =>
        `<a target="_blank" href="${url}">${url}</a>`
    );
}

export class SuiteAdapter {
    static create(suite: ISuite, config = {}): SuiteAdapter {
        return new this(suite, config);
    }

    constructor(
        protected _suite: ISuite,
        protected _config: IOptions
    ) {
    }

    protected _wrapSkipComment(skipComment?: string): string {
        return skipComment ? wrapLinkByTag(skipComment) : 'Unknown reason';
    }

    protected _configureUrl(url: string, baseHost: string): string {
        return _.isEmpty(baseHost)
            ? url
            : Uri(baseHost).resource(url).href();
    }
}
