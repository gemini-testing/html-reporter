'use strict';
var crypto = require('crypto');
exports.formatId = function (hash, browserId) { return hash + "/" + browserId; };
exports.getShortMD5 = function (str) {
    return crypto.createHash('md5').update(str, 'ascii').digest('hex').substr(0, 7);
};
exports.mkFullTitle = function (_a) {
    var suite = _a.suite, state = _a.state;
    // https://github.com/mochajs/mocha/blob/v2.4.5/lib/runnable.js#L165
    return suite.path.join(' ') + " " + state.name;
};
//# sourceMappingURL=utils.js.map