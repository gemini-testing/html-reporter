import {HermioneSuite} from './types';

export const getSuitePath = (suite?: HermioneSuite): string[] => {
    if (!suite) {
        return [];
    }

    return (suite as HermioneSuite).root ?
        [] :
        ([] as string[]).concat(getSuitePath(suite.parent as HermioneSuite)).concat(suite.title);
};
