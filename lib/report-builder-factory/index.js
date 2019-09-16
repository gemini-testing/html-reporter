'use strict';

const ReportBuilderJson = require('./report-builder-json');
const ReportBuilderSqlite = require('./report-builder-sqlite');

const adapters = {
    gemini: require('../test-adapter/gemini-test-adapter'),
    hermione: require('../test-adapter/hermione-test-adapter')
};

module.exports = {
    create: (toolName, tool, pluginConfig, isSqlite = false) => {
        if (isSqlite) {
            return ReportBuilderSqlite.create(tool, pluginConfig, adapters[toolName]);
        }
        return ReportBuilderJson.create(tool, pluginConfig, adapters[toolName]);
    }
};
