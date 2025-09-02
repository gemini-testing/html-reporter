import Fuse from 'fuse.js';

import {keyboardLayoutConverter} from '@/static/modules/utils';

type Element = {title: string};

let fuze: Fuse<Element>;
let fuzeMatchCase: Fuse<Element>;

export const initSearch = (list: string[]): void => {
    const preparedList = list.map((title) => ({title}));

    const options = {
        keys: ['title'],
        threshold: 0.1,
        findAllMatches: true,
        ignoreLocation: true,
        includeScore: false,
        distance: 10
    };

    fuze = new Fuse(
        preparedList,
        {
            ...options,
            isCaseSensitive: false
        }
    );

    fuzeMatchCase = new Fuse(
        preparedList,
        {
            ...options,
            isCaseSensitive: true
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
