'use strict';

const _ = require('lodash');
const QEmitter = require('qemitter');

exports.stubConfig = (config = {}) => {
    const browsers = config.browsers || {};
    const browserConfigs = {
        getBrowserIds: sinon.stub().named('getBrowserIds').returns(Object.keys(browsers)),
        forBrowser: sinon.stub().named('forBrowser').callsFake((bro) => _.defaults(browsers[bro], config))
    };

    return Object.assign(_.omit(config, 'browsers'), browserConfigs);
};

exports.stubTool = (config, events = {}) => {
    const tool = new QEmitter();

    tool.config = config || exports.stubConfig();
    tool.events = events;

    tool.readTests = sinon.stub();

    return tool;
};
