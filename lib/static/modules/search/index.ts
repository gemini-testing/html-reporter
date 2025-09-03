import {setSearchLoading, updateNameFilter, setMatchCaseFilter} from '@/static/modules/actions';
import {Page} from '@/static/new-ui/types/store';

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

export const search = (
    text: string,
    matchCase = false,
    page: Page,
    updateMatchCase: boolean,
    dispatch: (action: unknown) => void
): void => {
    dispatch(setSearchLoading(true));

    new Promise((resolve: (list: string[]) => void) => {
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
            };

            worker.onerror = (): void => {
                resolve([]);
            };
        } else {
            resolve([]);
        }
    }).then((result: string[]) => {
        searchResult = new Set(result);

        if (updateMatchCase) {
            dispatch(setMatchCaseFilter({
                data: matchCase,
                page
            }));
        } else {
            dispatch(
                updateNameFilter({
                    data: text,
                    page
                })
            );
        }

        dispatch(setSearchLoading(false));
    });
};
