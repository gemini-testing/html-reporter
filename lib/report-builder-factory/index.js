'use strict';

const ReportBuilder = require('./report-builder');
const adapters = {
    gemini: require('../test-adapter/gemini-test-adapter'),
    hermione: require('../test-adapter/hermione-test-adapter')
};

module.exports = {
    create: (toolName, tool, pluginConfig) => {
        return ReportBuilder.create(tool, pluginConfig, adapters[toolName]);
    }
};
