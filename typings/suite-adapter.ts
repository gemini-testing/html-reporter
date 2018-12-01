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
}
