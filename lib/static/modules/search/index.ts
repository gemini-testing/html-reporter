import {setMatchCaseFilter, setSearchLoading, updateNameFilter} from '@/static/modules/actions';
import {Page} from '@/constants';
import {Tree} from '@/tests-tree-builder/base';
import {AttachmentType, TagsAttachment} from '@/types';

let worker: Worker;
let searchResult: Set<string> = new Set([]);

export const initSearch = (tree: Tree): void => {
    const list = tree.results.allIds;

    const idTagMap: Record<string, string[]> = {};

    list.forEach((id: string): void => {
        const result = tree.results.byId[id];
        const tagsAttachment = result.attachments?.find(attachment => attachment.type === AttachmentType.Tags) as TagsAttachment;

        if (tagsAttachment) {
            idTagMap[result.parentId] = tagsAttachment.list.map(tag => tag.title);
        } else {
            idTagMap[result.parentId] = [];
        }
    });

    if (typeof Worker !== 'undefined') {
        worker = new Worker(
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            /* webpackChunkName: "search-worker" */ new URL('./worker.ts', import.meta.url)
        );
        worker.postMessage({type: 'init', data: idTagMap});
    }
};

export const checkSearchResultExits = (browserId: string): boolean => searchResult.has(browserId);

export const search = (
    text: string,
    matchCase = false,
    useRegexFilter = false,
    page: Page,
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
