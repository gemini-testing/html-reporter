export type SearchWorkerRequest = {
    type: 'init';
    requestId: number;
    data: Record<string, string[]>;
} | {
    type: 'patch';
    requestId: number;
    data: {
        removeIds: string[];
        idTagMap: Record<string, string[]>;
    };
} | {
    type: 'search';
    requestId: number;
    data: {
        text: string;
        matchCase: boolean;
    };
};

export type SearchWorkerResponse = {
    type: 'ready' | 'patched';
    requestId: number;
} | {
    type: 'search-result';
    requestId: number;
    data: string[];
};
