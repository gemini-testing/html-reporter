export interface IBrowser {
    retries?: any;
    result?: any;
    name: any;
}

export interface ISuite {
    imagesInfo?: string[];
    browsers?: IBrowser[];
    skipComment?: string;
    skipReason?: string;
    browserId?: string;
    timedOut?: boolean;
    suitePath?: string;
    fullName?: string;
    pending?: boolean;
    attempt?: number;
    tests?: ISuite[];
    fullUrl?: string;
    parent?: ISuite;
    path?: string[];
    title?: string;
    sync?: boolean;
    async?: number;
    children?: any;
    root?: boolean;
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
