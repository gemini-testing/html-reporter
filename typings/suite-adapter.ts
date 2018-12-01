export interface ISuite {
    imagesInfo?: string[];
    skipComment?: string;
    skipReason?: string;
    browserId?: string;
    timedOut?: boolean;
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
