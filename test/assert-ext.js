global.assert.calledOnceWith = (...args) => {
    assert.calledOnce(args[0]);
    assert.calledWith(...args);
};

global.assert.calledOnceWithExactly = function() {
    assert.calledOnce(arguments[0]);
    assert.calledWithExactly.apply(null, arguments);
};
