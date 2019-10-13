'use strict';

const ReportBuilderFactory = require('lib/report-builder-factory');
const ReportBuilderJson = require('lib/report-builder-factory/report-builder-json');
const ReportBuilderSqlite = require('lib/report-builder-factory/report-builder-sqlite');

describe('report builder factory', () => {
    const sandbox = sinon.sandbox.create();

    beforeEach(() => {
        sandbox.stub(ReportBuilderJson, 'create');
        sandbox.stub(ReportBuilderSqlite, 'create');
    });

    afterEach(() => sandbox.restore());

    it('should create report-builder-json when "isSqlite" flag is not set', () => {
        ReportBuilderFactory.create('hermione', {plugin: 'config'});
        assert.calledWith(ReportBuilderJson.create, 'hermione', {plugin: 'config'});
    });

    it('should create report-builder-sqlite when "isSqlite" flag is true', () => {
        ReportBuilderFactory.create('hermione', {plugin: 'config'}, true);
        assert.calledWith(ReportBuilderSqlite.create, 'hermione', {plugin: 'config'});
    });
});
