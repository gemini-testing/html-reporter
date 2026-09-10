import {setMatchCaseFilter, setSearchLoading, updateNameFilter} from '@/static/modules/actions';
import {Tree} from '@/tests-tree-builder/base';
import type {TreePatch} from '@/tests-tree-builder/tree-patch';
import {AttachmentType, TagsAttachment} from '@/types';
import type {SearchWorkerRequest, SearchWorkerResponse} from './types';

let worker: Worker | undefined;
let searchResult: Set<string> = new Set([]);
let searchResultPosition: Map<string, number> = new Map<string, number>([]);
let nextRequestId = 0;
const pendingSearches = new Map<number, (result: string[]) => void>();
const pendingUpdates = new Map<number, () => void>();

const postMessage = (message: SearchWorkerRequest): void => worker?.postMessage(message);

const handleWorkerMessage = (event: MessageEvent<SearchWorkerResponse>): void => {
    const {requestId} = event.data;

    if (event.data.type === 'search-result') {
        pendingSearches.get(requestId)?.(event.data.data);
        pendingSearches.delete(requestId);
    } else {
        pendingUpdates.get(requestId)?.();
        pendingUpdates.delete(requestId);
    }
};

const handleWorkerError = (): void => {
    worker = undefined;
    pendingSearches.forEach(resolve => resolve([]));
    pendingSearches.clear();
    pendingUpdates.forEach(resolve => resolve());
    pendingUpdates.clear();
};

const waitForUpdate = (message: SearchWorkerRequest & {type: 'init' | 'patch'}): Promise<void> => new Promise(resolve => {
    pendingUpdates.set(message.requestId, resolve);
    postMessage(message);
});

const getResultTags = (result: Tree['results']['byId'][string]): string[] => {
    const tagsAttachment = result.attachments?.find(attachment => attachment.type === AttachmentType.Tags) as TagsAttachment;

    return tagsAttachment ? tagsAttachment.list.map(tag => tag.title) : [];
};

export const initSearch = (tree: Tree, performanceId?: number): Promise<void> => {
    const list = tree.results.allIds;

    const idTagMap: Record<string, string[]> = {};

    list.forEach((id: string): void => {
        const result = tree.results.byId[id];
        idTagMap[result.parentId] = getResultTags(result);
    });

    if (typeof Worker !== 'undefined') {
        const previousWorker = worker;
        if (previousWorker) {
            handleWorkerError();
            previousWorker.terminate();
        }
        worker = new Worker(
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            /* webpackChunkName: "search-worker" */ new URL('./worker.ts', import.meta.url)
        );
        worker.onmessage = handleWorkerMessage;
        worker.onerror = handleWorkerError;
        const requestId = ++nextRequestId;

        return waitForUpdate({type: 'init', requestId, data: idTagMap, performanceId});
    }

    return Promise.resolve();
};

export const patchSearch = (tree: Tree, patch: TreePatch, performanceId?: number): Promise<void> => {
    if (typeof Worker === 'undefined') {
        return Promise.resolve();
    }

    if (!worker) {
        return initSearch(tree, performanceId);
    }

    const affectedBrowserIds = new Set([
        ...Object.keys(patch.browsers.byId),
        ...Object.values(patch.results.byId).map(result => result.parentId)
    ]);
    const idTagMap: Record<string, string[]> = {};

    affectedBrowserIds.forEach(browserId => {
        const browser = tree.browsers.byId[browserId];
        const lastResultId = browser?.resultIds.at(-1);
        const result = lastResultId ? tree.results.byId[lastResultId] : undefined;

        if (result) {
            idTagMap[browserId] = getResultTags(result);
        }
    });

    const requestId = ++nextRequestId;

    return waitForUpdate({
        type: 'patch',
        requestId,
        data: {
            removeIds: [...patch.browsers.removedIds, ...affectedBrowserIds],
            idTagMap
        },
        performanceId
    });
};

export const checkSearchResultExits = (browserId: string): boolean => searchResult.has(browserId);
export const getSearchPosition = (item: string): number => searchResultPosition.get(item) || -1;

export const search = (
    text: string,
    matchCase = false,
    useRegexFilter = false,
    updateMatchCase: boolean,
    dispatch: (action: unknown) => void
): Promise<void> => {
    dispatch(setSearchLoading(true));

    return new Promise((resolve: (list: string[]) => void) => {
        if (useRegexFilter) {
            resolve([]);
            return;
        }

        if (worker) {
            const requestId = ++nextRequestId;
            pendingSearches.set(requestId, resolve);
            postMessage({
                type: 'search',
                requestId,
                data: {
                    text,
                    matchCase
                }
            });
        } else {
            resolve([]);
        }
    }).then((result: string[]) => {
        searchResult = new Set(result);
        searchResultPosition = new Map<string, number>();

        result.forEach((item, index) => {
            searchResultPosition.set(
                item,
                result.length - index
            );
        });

        if (updateMatchCase) {
            dispatch(setMatchCaseFilter({
                data: matchCase
            }));
        } else {
            dispatch(
                updateNameFilter({
                    data: text
                })
            );
        }

        dispatch(setSearchLoading(false));
    });
};

interface SearchOptions {
    text: string;
    matchCase: boolean;
    useRegexFilter: boolean;
}

export const refreshSearch = async (
    tree: Tree,
    patch: TreePatch,
    getOptions: () => SearchOptions,
    dispatch: (action: unknown) => void,
    performanceId?: number
): Promise<void> => {
    await patchSearch(tree, patch, performanceId);
    const {text, matchCase, useRegexFilter} = getOptions();

    await search(text, matchCase, useRegexFilter, false, dispatch);
};
