'use strict';

const ReportBuilderJson = require('./report-builder-json');
const ReportBuilderSqlite = require('./report-builder-sqlite');

const adapters = {
    gemini: require('../test-adapter/gemini-test-adapter'),
    hermione: require('../test-adapter/hermione-test-adapter')
};

module.exports = {
    create: (toolName, tool, pluginConfig, isSqlite = false) => {
        const ReportBuilder = isSqlite ? ReportBuilderSqlite : ReportBuilderJson;
        return ReportBuilder.create(tool, pluginConfig, adapters[toolName]);
    }
};
