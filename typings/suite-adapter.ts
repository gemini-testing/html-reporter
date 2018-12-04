import {SuiteAdapter} from 'lib/suite-adapter/suite-adapter';
import GeminiSuiteAdapter from 'lib/suite-adapter/gemini-suite-adapter';
import HermioneSuiteAdapter from 'lib/suite-adapter/hermione-suite-adapter';

export interface IBrowser {
    retries?: any;
    result?: any;
    name: any;
}

export type SuiteType = SuiteAdapter | HermioneSuiteAdapter | GeminiSuiteAdapter;

export interface ISuite {
    acceptTestAttempt?: number;
    imagesInfo?: string[];
    skipComment?: string;
    skipReason?: string;
    browserResult?: any;
    browserId?: string;
    timedOut?: boolean;
    suitePath?: string;
    fullName?: string;
    pending?: boolean;
    attempt?: number;
    tests?: ISuite[];
    fullUrl?: string;
    parent?: ISuite;
    status?: string;
    path?: string[];
    title?: string;
    sync?: boolean;
    async?: number;
    root?: boolean;
    browsers?: any;
    children?: any;
    type?: string;
    body?: string;
    file?: string;
    url?: string;
    ctx?: string;
    meta?: {
        url: string;
    };
    fullTitle?(): string;
    getUrl?(config: {
        browserId: string;
        baseHost: string;
    }): string;
}
