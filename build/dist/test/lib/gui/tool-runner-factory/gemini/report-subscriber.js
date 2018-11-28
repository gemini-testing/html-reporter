'use strict';
var EventEmitter = require('events').EventEmitter;
var reportSubscriber = require('lib/gui/tool-runner-factory/gemini/report-subscriber');
var ReportBuilder = require('lib/report-builder-factory/report-builder');
var clientEvents = require('lib/gui/constants/client-events');
var RUNNING = require('lib/constants/test-statuses').RUNNING;
var _a = require('test/utils'), stubTool = _a.stubTool, stubConfig = _a.stubConfig;
describe('lib/gui/tool-runner-factory/gemini/report-subscriber', function () {
    var sandbox = sinon.createSandbox();
    var reportBuilder;
    var client;
    var events = {
        END_RUNNER: 'endRunner',
        BEGIN_STATE: 'beginState'
    };
    var mkGemini_ = function () { return stubTool(stubConfig(), events); };
    beforeEach(function () {
        reportBuilder = sinon.createStubInstance(ReportBuilder);
        sandbox.stub(ReportBuilder, 'create').returns(reportBuilder);
        reportBuilder.save.resolves();
        client = new EventEmitter();
        sandbox.spy(client, 'emit');
    });
    afterEach(function () { return sandbox.restore(); });
    describe('END_RUNNER', function () {
        it('should save report', function () {
            var gemini = mkGemini_();
            reportSubscriber(gemini, reportBuilder, client);
            return gemini.emitAndWait(gemini.events.END_RUNNER)
                .then(function () { return assert.calledOnce(reportBuilder.save); });
        });
        it('should emit "END" event for client', function () {
            var gemini = mkGemini_();
            reportSubscriber(gemini, reportBuilder, client);
            return gemini.emitAndWait(gemini.events.END_RUNNER)
                .then(function () { return assert.calledOnceWith(client.emit, clientEvents.END); });
        });
    });
    describe('BEGIN_STATE', function () {
        it('should emit "BEGIN_STATE" event for client with correct data', function () {
            var gemini = mkGemini_();
            var testData = {
                state: {
                    name: 'state-name',
                    suite: { path: ['suite-name'] }
                },
                browserId: 'bro'
            };
            reportSubscriber(gemini, reportBuilder, client);
            gemini.emit(gemini.events.BEGIN_STATE, testData);
            assert.calledOnceWith(client.emit, clientEvents.BEGIN_STATE, {
                browserId: 'bro',
                suitePath: ['suite-name', 'state-name'],
                status: RUNNING
            });
        });
    });
});
//# sourceMappingURL=report-subscriber.js.map