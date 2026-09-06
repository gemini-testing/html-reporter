import Fuse from 'fuse.js';
import type {Expression} from 'fuse.js';

import {keyboardLayoutConverter} from '@/static/modules/utils';

type Element = {title: string};

let fuse: Fuse<Element>;
let fuseMatchCase: Fuse<Element>;

const initSearch = (idTagMap: Record<string, string[]>): void => {
    const list = Object.keys(idTagMap);
    const preparedList = list
        .map((title) => ({
            title,
            tags: '@' + idTagMap[title].join(' @')
        }));

    const options = {
        keys: ['title', 'tags'],
        threshold: 0.1,
        findAllMatches: true,
        ignoreLocation: true,
        includeScore: false,
        distance: 100
    };

    fuse = new Fuse(
        preparedList,
        {
            ...options,
            isCaseSensitive: false
        }
    );

    fuseMatchCase = new Fuse(
        preparedList,
        {
            ...options,
            isCaseSensitive: true
        }
    );
};

const search = (testNameFilter: string, matchCase = false): string[] => {
    if (!fuse || !fuseMatchCase || !testNameFilter) {
        return [];
    }

    const tagsRegex = /@[a-zA-Z0-9_-]+/g;
    const text = testNameFilter.replace(tagsRegex, '').trim();
    const tags = testNameFilter.match(tagsRegex) ?? [];

    const query = {
        $and: tags.map((tag) =>({
            tags: tag
        }) as Expression)
    };

    if (text && text.length > 0) {
        query.$and.push({
            $or: [
                {title: text},
                {title: keyboardLayoutConverter(text)}
            ]
        });
    }

    if (matchCase) {
        return fuseMatchCase.search(query).map((item) => item.item.title);
    } else {
        return fuse.search(query).map((item) => item.item.title);
    }
};

type InitMessage = {
    type: 'init';
    data: Record<string, string[]>;
    performanceId?: number;
}

type SearchMessage = {
    type: 'search';
    data: {
        text: string;
        matchCase: boolean;
    };
}

type PatchMessage = {
    type: 'patch';
    data: {
        removeIds: string[];
        idTagMap: Record<string, string[]>;
    };
    performanceId?: number;
}

self.onmessage = (event: MessageEvent<InitMessage | PatchMessage | SearchMessage>): void => {
    switch (event.data.type) {
        case 'init': {
            const startedAt = performance.now();
            initSearch(event.data.data);
            if (event.data.performanceId !== undefined) {
                console.info(`[watch-perf][client][#${event.data.performanceId}][search worker] rebuild index: ${(performance.now() - startedAt).toFixed(1)}ms`, {
                    items: Object.keys(event.data.data).length
                });
            }
            self.postMessage(true);
            break;
        }
        case 'patch': {
            const startedAt = performance.now();
            const removeIds = new Set(event.data.data.removeIds);
            const preparedItems = Object.entries(event.data.data.idTagMap).map(([title, tags]) => ({
                title,
                tags: '@' + tags.join(' @')
            }));

            fuse.remove(item => removeIds.has(item.title));
            fuseMatchCase.remove(item => removeIds.has(item.title));
            preparedItems.forEach(item => {
                fuse.add(item);
                fuseMatchCase.add(item);
            });

            if (event.data.performanceId !== undefined) {
                console.info(`[watch-perf][client][#${event.data.performanceId}][search worker] patch index: ${(performance.now() - startedAt).toFixed(1)}ms`, {
                    removed: removeIds.size,
                    upserted: preparedItems.length
                });
            }
            self.postMessage(true);
            break;
        }
        case 'search': {
            const result: string[] = search(event.data.data.text, event.data.data.matchCase);
            self.postMessage(result);
            break;
        }
    }
};
