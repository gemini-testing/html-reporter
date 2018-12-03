export interface IOptions {
    enable?: boolean;
    path?: string;
    defaultView?: 'all' | 'failed';
    baseHost?: string;
    scaleImages?: boolean;
    lazyLoadOffset?: number;
}

export interface IHermione {
    [key: string]: any;
}

export interface IStats {
    retries: number;
    skipped: number;
    passed: number;
    failed: number;
    total: number;
}
