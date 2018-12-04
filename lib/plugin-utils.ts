import { ISuite } from 'typings/suite-adapter';

const getSuitePath = (suite: ISuite): string[] => {
    return suite.root ? [] : (new Array<string>()).concat(getSuitePath(suite.parent || {})).concat(suite.title || []);
};

const getHermioneUtils = () => ({getSuitePath});

module.exports = {getHermioneUtils};
