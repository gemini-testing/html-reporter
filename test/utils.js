'use strict';

const QEmitter = require('qemitter');

exports.stubConfig = (browserConfigs = {}) => {
    return {
        getBrowserIds: sinon.stub().named('getBrowserIds').returns(Object.keys(browserConfigs)),
        forBrowser: sinon.stub().named('forBrowser').callsFake((bro) => browserConfigs[bro])
    };
};

exports.stubTool = (config, events = {}) => {
    const tool = new QEmitter();

    tool.config = config || exports.stubConfig();
    tool.events = events;

    tool.readTests = sinon.stub();

    return tool;
};
