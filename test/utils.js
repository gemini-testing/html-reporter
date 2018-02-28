'use strict';

const QEmitter = require('qemitter');

exports.stubConfig = () => {
    return {
        getBrowserIds: sinon.stub().returns([]),
        forBrowser: sinon.stub()
    };
};

exports.stubTool = (config, events = {}) => {
    const tool = new QEmitter();

    tool.config = config || exports.stubConfig();
    tool.events = events;

    tool.readTests = sinon.stub();

    return tool;
};
