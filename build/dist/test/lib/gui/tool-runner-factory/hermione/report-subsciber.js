'use strict';
var EventEmitter = require('events').EventEmitter;
var reportSubscriber = require('lib/gui/tool-runner-factory/hermione/report-subscriber');
var ReportBuilder = require('lib/report-builder-factory/report-builder');
var clientEvents = require('lib/gui/constants/client-events');
var RUNNING = require('lib/constants/test-statuses').RUNNING;
var _a = require('test/utils'), stubTool = _a.stubTool, stubConfig = _a.stubConfig;
describe('lib/gui/tool-runner-factory/hermione/report-subscriber', function () {
    var sandbox = sinon.createSandbox();
    var reportBuilder;
    var client;
    var events = {
        RUNNER_END: 'runnerEnd',
        TEST_BEGIN: 'testBegin'
    };
    var mkHermione_ = function () { return stubTool(stubConfig(), events); };
    beforeEach(function () {
        reportBuilder = sinon.createStubInstance(ReportBuilder);
        sandbox.stub(ReportBuilder, 'create').returns(reportBuilder);
        reportBuilder.save.resolves();
        client = new EventEmitter();
        sandbox.spy(client, 'emit');
    });
    afterEach(function () { return sandbox.restore(); });
    describe('RUNNER_END', function () {
        it('should save report', function () {
            var hermione = mkHermione_();
            reportSubscriber(hermione, reportBuilder, client);
            return hermione.emitAndWait(hermione.events.RUNNER_END)
                .then(function () { return assert.calledOnce(reportBuilder.save); });
        });
        it('should emit "END" event for client', function () {
            var hermione = mkHermione_();
            reportSubscriber(hermione, reportBuilder, client);
            return hermione.emitAndWait(hermione.events.RUNNER_END)
                .then(function () { return assert.calledOnceWith(client.emit, clientEvents.END); });
        });
    });
    describe('TEST_BEGIN', function () {
        it('should emit "BEGIN_STATE" event for client with correct data', function () {
            var hermione = mkHermione_();
            var testData = {
                title: 'suite-title',
                parent: { title: 'root-title', parent: { root: true } },
                browserId: 'bro'
            };
            reportSubscriber(hermione, reportBuilder, client);
            hermione.emit(hermione.events.TEST_BEGIN, testData);
            assert.calledOnceWith(client.emit, clientEvents.BEGIN_STATE, {
                browserId: 'bro',
                suitePath: ['root-title', 'suite-title'],
                status: RUNNING
            });
        });
    });
});
//# sourceMappingURL=report-subsciber.js.map