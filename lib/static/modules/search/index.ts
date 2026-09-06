import {setMatchCaseFilter, setSearchLoading, updateNameFilter} from '@/static/modules/actions';
import {Tree} from '@/tests-tree-builder/base';
import type {TreePatch} from '@/tests-tree-builder/tree-patch';
import {AttachmentType, TagsAttachment} from '@/types';

let worker: Worker;
let searchResult: Set<string> = new Set([]);
let searchResultPosition: Map<string, number> = new Map<string, number>([]);

const getResultTags = (result: Tree['results']['byId'][string]): string[] => {
    const tagsAttachment = result.attachments?.find(attachment => attachment.type === AttachmentType.Tags) as TagsAttachment;

    return tagsAttachment ? tagsAttachment.list.map(tag => tag.title) : [];
};

export const initSearch = (tree: Tree, performanceId?: number): void => {
    const list = tree.results.allIds;

    const idTagMap: Record<string, string[]> = {};

    list.forEach((id: string): void => {
        const result = tree.results.byId[id];
        idTagMap[result.parentId] = getResultTags(result);
    });

    if (typeof Worker !== 'undefined') {
        worker?.terminate();
        worker = new Worker(
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            /* webpackChunkName: "search-worker" */ new URL('./worker.ts', import.meta.url)
        );
        worker.postMessage({type: 'init', data: idTagMap, performanceId});
    }
};

export const patchSearch = (tree: Tree, patch: TreePatch, performanceId?: number): void => {
    if (typeof Worker === 'undefined') {
        return;
    }

    if (!worker) {
        initSearch(tree, performanceId);
        return;
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

    worker.postMessage({
        type: 'patch',
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
): void => {
    dispatch(setSearchLoading(true));

    new Promise((resolve: (list: string[]) => void) => {
        if (useRegexFilter) {
            resolve([]);
            return;
        }

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
                console.error(`Error while searching ${text}`);
                resolve([]);
            };
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
