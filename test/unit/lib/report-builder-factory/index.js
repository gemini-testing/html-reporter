'use strict';

const ReportBuilderFactory = require('lib/report-builder-factory');
const ReportBuilder = require('lib/report-builder-factory/report-builder');
const GeminiTestAdapter = require('lib/test-adapter/gemini-test-adapter');
const HermioneTestAdapter = require('lib/test-adapter/hermione-test-adapter');

describe('report builder factory', () => {
    const sandbox = sinon.sandbox.create();

    beforeEach(() => {
        sandbox.stub(ReportBuilder, 'create');
    });

    afterEach(() => sandbox.restore());

    it('should create report builder with passed configs and "gemini" test adapter', () => {
        ReportBuilderFactory.create('gemini', {tool: 'config'}, {plugin: 'config'});

        assert.calledWith(ReportBuilder.create, {tool: 'config'}, {plugin: 'config'}, GeminiTestAdapter);
    });

    it('should create report builder with passed configs and "hermione" test adapter', () => {
        ReportBuilderFactory.create('hermione', {tool: 'config'}, {plugin: 'config'});

        assert.calledWith(ReportBuilder.create, {tool: 'config'}, {plugin: 'config'}, HermioneTestAdapter);
    });
});
