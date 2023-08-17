import {Suite, TestResult} from './types';

export const getSuitePath = (suite: TestResult | Suite): string[] => {
    return (suite as Suite).root ?
        [] :
        ([] as string[]).concat(getSuitePath(suite.parent as Suite)).concat(suite.title);
};
