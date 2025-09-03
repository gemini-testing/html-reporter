import Fuse from 'fuse.js';

import {keyboardLayoutConverter} from '@/static/modules/utils';

type Element = {title: string};

let fuze: Fuse<Element>;
let fuzeMatchCase: Fuse<Element>;

const initSearch = (list: string[]): void => {
    const preparedList = list.map((title) => ({title}));

    const options = {
        keys: ['title'],
        threshold: 0.2,
        findAllMatches: true,
        ignoreLocation: true,
        includeScore: false,
        distance: 100
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

const worker = (testNameFilter: string, matchCase = false): string[] => {
    if (!fuze || !fuzeMatchCase || !testNameFilter) {
        return [];
    }

    const query = {
        $or: [{title: testNameFilter}, {title: keyboardLayoutConverter(testNameFilter)}]
    };

    if (matchCase) {
        return fuzeMatchCase.search(query).map((item) => item.item.title);
    } else {
        return fuze.search(query).map((item) => item.item.title);
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
            const result: string[] = worker(event.data.data.text, event.data.data.matchCase);
            self.postMessage(result);
            break;
        }
    }
};
