import Fuse from 'fuse.js';

import {keyboardLayoutConverter} from '@/static/modules/utils';

type Element = {title: string};

let fuse: Fuse<Element>;
let fuseMatchCase: Fuse<Element>;

const initSearch = (list: string[]): void => {
    const preparedList = list.map((title) => ({title}));

    const options = {
        keys: ['title'],
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

    const query = {
        $or: [{title: testNameFilter}, {title: keyboardLayoutConverter(testNameFilter)}]
    };

    if (matchCase) {
        return fuseMatchCase.search(query).map((item) => item.item.title);
    } else {
        return fuse.search(query).map((item) => item.item.title);
    }
};

type InitMessage = {
    type: 'init';
    data: string[];
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
