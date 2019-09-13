'use strict';

const ReportBuilder = require('./report-builder');
const ReportBuilderSqlite = require('./report-builder-sqlite');

const adapters = {
    gemini: require('../test-adapter/gemini-test-adapter'),
    hermione: require('../test-adapter/hermione-test-adapter')
};

module.exports = {
    create: (toolName, tool, pluginConfig, SqliteAdapter = undefined) => {
        return SqliteAdapter ? ReportBuilderSqlite.create(tool, pluginConfig, adapters[toolName], SqliteAdapter)
                             : ReportBuilder.create(tool, pluginConfig, adapters[toolName]);
    }
};
