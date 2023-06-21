'use strict';

const getSuitePath = (suite) => {
    return suite.root ? [] : [].concat(getSuitePath(suite.parent)).concat(suite.title);
};

const getHermioneUtils = () => ({getSuitePath});

module.exports = {getHermioneUtils};
