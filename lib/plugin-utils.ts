import {Suite} from './types';

export const getSuitePath = (suite: Suite): string[] => {
    return suite.root ?
        [] :
        ([] as string[]).concat(getSuitePath(suite.parent as Suite)).concat(suite.title);
};
