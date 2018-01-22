global.assert.calledOnceWith = (...args) => {
    assert.calledOnce(args[0]);
    assert.calledWith(...args);
};
