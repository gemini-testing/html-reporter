'use strict';
var ReportBuilderFactory = require('../../../lib/report-builder-factory');
var ReportBuilder = require('../../../lib/report-builder-factory/report-builder');
var GeminiTestAdapter = require('../../../lib/test-adapter/gemini-test-adapter');
var HermioneTestAdapter = require('../../../lib/test-adapter/hermione-test-adapter');
describe('report builder factory', function () {
    var sandbox = sinon.sandbox.create();
    beforeEach(function () {
        sandbox.stub(ReportBuilder, 'create');
    });
    afterEach(function () { return sandbox.restore(); });
    it('should create report builder with passed configs and "gemini" test adapter', function () {
        ReportBuilderFactory.create('gemini', { tool: 'config' }, { plugin: 'config' });
        assert.calledWith(ReportBuilder.create, { tool: 'config' }, { plugin: 'config' }, GeminiTestAdapter);
    });
    it('should create report builder with passed configs and "hermione" test adapter', function () {
        ReportBuilderFactory.create('hermione', { tool: 'config' }, { plugin: 'config' });
        assert.calledWith(ReportBuilder.create, { tool: 'config' }, { plugin: 'config' }, HermioneTestAdapter);
    });
});
//# sourceMappingURL=index.js.map