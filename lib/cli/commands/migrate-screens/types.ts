import {LooksSameOptions as LooksSameOptionsBase} from 'looks-same';

export interface TimingStats {
    startedAt: number;
    downloadMs: number;
    compareMs: number;
    downloads: number;
    comparisons: number;
}

export type LooksSameOptions = LooksSameOptionsBase & {createDiffImage?: false};
export type RefPathMap = {from: string; to: string};
