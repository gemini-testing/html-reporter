let worker: Worker;
let searchResult: Set<string> = new Set([]);

export const initSearch = (list: string[]): void => {
    if (typeof Worker !== 'undefined') {
        worker = new Worker(
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            /* webpackChunkName: "search-worker" */ new URL('./worker.ts', import.meta.url)
        );
        worker.postMessage({type: 'init', data: list});
    }
};

export const checkSearch = (browserId: string): boolean => searchResult.has(browserId);

export const search = (text: string, matchCase = false): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        if (worker) {
            worker.postMessage({
                type: 'search',
                data: {
                    text,
                    matchCase
                }
            });

            worker.onmessage = (event: MessageEvent<string[]>): void => {
                resolve(event.data);
                searchResult = new Set(event.data);
            };

            worker.onerror = (err): void => {
                searchResult = new Set([]);
                reject(err);
            };
        } else {
            searchResult = new Set([]);
            reject();
        }
    });
};
