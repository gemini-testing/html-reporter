'use strict';
module.exports = /** @class */ (function () {
    function Runner(collection) {
        this._collection = collection;
    }
    Runner.prototype.run = function (runHandler) {
        return runHandler(this._collection);
    };
    return Runner;
}());
//# sourceMappingURL=runner.js.map