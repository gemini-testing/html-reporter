'use strict';

const ReportBuilderJson = require('./report-builder-json');
const ReportBuilderSqlite = require('./report-builder-sqlite');

module.exports = {
    create: (hermione, pluginConfig, isSqlite = false) => {
        const ReportBuilder = isSqlite ? ReportBuilderSqlite : ReportBuilderJson;
        return ReportBuilder.create(hermione, pluginConfig);
    }
};
