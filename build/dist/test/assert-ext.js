global.assert.calledOnceWith = function () {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    assert.calledOnce(args[0]);
    assert.calledWith.apply(assert, args);
};
//# sourceMappingURL=assert-ext.js.map