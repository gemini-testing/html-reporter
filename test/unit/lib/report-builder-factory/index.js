'use strict';

const ReportBuilderFactory = require('lib/report-builder-factory');
const ReportBuilderJson = require('lib/report-builder-factory/report-builder-json');
const ReportBuilderSqlite = require('lib/report-builder-factory/report-builder-sqlite');
const GeminiTestAdapter = require('lib/test-adapter/gemini-test-adapter');
const HermioneTestAdapter = require('lib/test-adapter/hermione-test-adapter');

describe('report builder factory', () => {
    const sandbox = sinon.sandbox.create();

    beforeEach(() => {
        sandbox.stub(ReportBuilderJson, 'create');
        sandbox.stub(ReportBuilderSqlite, 'create');
    });

    afterEach(() => sandbox.restore());

    it('should create report-builder-json with passed configs and "gemini" test adapter', () => {
        ReportBuilderFactory.create('gemini', {tool: 'config'}, {plugin: 'config'});

        assert.calledWith(ReportBuilderJson.create, {tool: 'config'}, {plugin: 'config'}, GeminiTestAdapter);
    });

    it('should create report-builder-json with passed configs and "hermione" test adapter', () => {
        ReportBuilderFactory.create('hermione', {tool: 'config'}, {plugin: 'config'});

        assert.calledWith(ReportBuilderJson.create, {tool: 'config'}, {plugin: 'config'}, HermioneTestAdapter);
    });

    it('should create report-builder-sqlite with passed configs and "hermione" test adapter', () => {
        ReportBuilderFactory.create('hermione', {tool: 'config'}, {plugin: 'config'}, true);
        assert.calledWith(ReportBuilderSqlite.create, {tool: 'config'}, {plugin: 'config'}, HermioneTestAdapter);
    });

    it('should create report-builder-json when "isSqlite" flag is not set', () => {
        ReportBuilderFactory.create('hermione', {tool: 'config'}, {plugin: 'config'});
        assert.calledWith(ReportBuilderJson.create, {tool: 'config'}, {plugin: 'config'}, HermioneTestAdapter);
    });

    it('should create report-builder-sqlite when "isSqlite" flag is true', () => {
        ReportBuilderFactory.create('hermione', {tool: 'config'}, {plugin: 'config'}, true);
        assert.calledWith(ReportBuilderSqlite.create, {tool: 'config'}, {plugin: 'config'}, HermioneTestAdapter);
    });
});
