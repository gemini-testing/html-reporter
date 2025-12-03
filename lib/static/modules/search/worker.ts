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
}

type SearchMessage = {
    type: 'search';
    data: {
        text: string;
        matchCase: boolean;
    };
}

self.onmessage = (event: MessageEvent<InitMessage | SearchMessage>): void => {
    switch (event.data.type) {
        case 'init': {
            initSearch(event.data.data);
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
