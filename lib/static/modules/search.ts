import Fuse from 'fuse.js';
import {keyboardLayoutConverter} from '@/static/modules/utils';

export const search = (list: string[], testNameFilter: string, matchCase = false): Set<string> => {
    const fuze = new Fuse(
        list.map((title) => ({title})),
        {
            keys: ['title'],
            threshold: 0.1,
            isCaseSensitive: matchCase,
            findAllMatches: true,
            ignoreLocation: true,
            includeScore: false,
            distance: 50
        }
    );
    if (!fuze) {
        return new Set([]);
    }

    const query = {
        $or: [{title: testNameFilter}, {title: keyboardLayoutConverter(testNameFilter)}]
    };

    return new Set(fuze.search(query).map((item) => item.item.title));
};
