'use strict';
var getSuitePath = function (suite) {
    return suite.root ? [] : [].concat(getSuitePath(suite.parent)).concat(suite.title);
};
var getHermioneUtils = function () { return ({ getSuitePath: getSuitePath }); };
module.exports = { getHermioneUtils: getHermioneUtils };
//# sourceMappingURL=plugin-utils.js.map