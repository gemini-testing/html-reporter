import Fuse from 'fuse.js';

import {keyboardLayoutConverter} from '@/static/modules/utils';

type Element = {title: string};

let fuze: Fuse<Element>;
let fuzeMatchCase: Fuse<Element>;

export const initSearch = (list: string[]): void => {
    fuze = new Fuse(
        list.map((title) => ({title})),
        {
            keys: ['title'],
            threshold: 0.1,
            isCaseSensitive: false,
            findAllMatches: true,
            ignoreLocation: true,
            includeScore: false,
            distance: 50
        }
    );

    fuzeMatchCase = new Fuse(
        list.map((title) => ({title})),
        {
            keys: ['title'],
            threshold: 0.1,
            isCaseSensitive: true,
            findAllMatches: true,
            ignoreLocation: true,
            includeScore: false,
            distance: 50
        }
    );
};

export const search = (testNameFilter: string, matchCase = false): Set<string> => {
    if (!fuze || !fuzeMatchCase || !testNameFilter) {
        return new Set([]);
    }

    const query = {
        $or: [{title: testNameFilter}, {title: keyboardLayoutConverter(testNameFilter)}]
    };

    if (matchCase) {
        return new Set(fuzeMatchCase.search(query).map((item) => item.item.title));
    } else {
        return new Set(fuze.search(query).map((item) => item.item.title));
    }
};
