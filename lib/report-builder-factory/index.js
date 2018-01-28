'use strict';

const ReportBuilder = require('./report-builder');
const adapters = {
    gemini: require('../test-adapter/gemini-test-adapter'),
    hermione: require('../test-adapter/hermione-test-adapter')
};

module.exports = {
    create: (toolName, toolConfig, pluginConfig) => {
        return ReportBuilder.create(toolConfig, pluginConfig, adapters[toolName]);
    }
};
