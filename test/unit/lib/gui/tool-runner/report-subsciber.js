'use strict';

const {EventEmitter} = require('events');
const Promise = require('bluebird');
const _ = require('lodash');
const reportSubscriber = require('lib/gui/tool-runner/report-subscriber');
const GuiReportBuilder = require('lib/report-builder/gui');
const clientEvents = require('lib/gui/constants/client-events');
const {stubTool, stubConfig} = require('test/unit/utils');
const {HermioneTestAdapter} = require('lib/test-adapter');
const {ErrorName} = require('lib/errors');

describe('lib/gui/tool-runner/hermione/report-subscriber', () => {
    const sandbox = sinon.createSandbox();
    let reportBuilder;
    let client;

    const events = {
        RUNNER_END: 'runnerEnd',
        TEST_BEGIN: 'testBegin',
        TEST_PENDING: 'pendingTest',
        TEST_FAIL: 'failTest',
        AFTER_TESTS_READ: 'afterTestsRead'
    };

    const mkHermione_ = () => stubTool(stubConfig(), events);

    const mkHermioneTestResult = (opts = {}) => _.defaults(opts, {
        fullTitle: () => 'some-title',
        browserId: 'some-browser',
        assertViewResults: [],
        metaInfo: {}
    });

    beforeEach(() => {
        reportBuilder = sinon.createStubInstance(GuiReportBuilder);
        reportBuilder.getCurrAttempt.returns(0);

        sandbox.stub(GuiReportBuilder, 'create').returns(reportBuilder);
        sandbox.stub(reportBuilder, 'imageHandler').value({saveTestImages: sinon.stub()});
        sandbox.stub(HermioneTestAdapter.prototype, 'id').value('some-id');

        client = new EventEmitter();
        sandbox.spy(client, 'emit');
    });

    afterEach(() => sandbox.restore());

    describe('RUNNER_END', () => {
        it('should emit "END" event for client', () => {
            const hermione = mkHermione_();

            reportSubscriber(hermione, reportBuilder, client);

            return hermione.emitAsync(hermione.events.RUNNER_END)
                .then(() => assert.calledOnceWith(client.emit, clientEvents.END));
        });

        it('should emit "END" event after all promises are resolved', async () => {
            const hermione = mkHermione_();
            const testResult = mkHermioneTestResult();
            const mediator = sinon.spy().named('mediator');

            reportBuilder.imageHandler.saveTestImages.callsFake(() => Promise.delay(100).then(mediator));

            reportSubscriber(hermione, reportBuilder, client);
            hermione.emit(hermione.events.TEST_FAIL, testResult);
            await hermione.emitAsync(hermione.events.RUNNER_END);

            assert.callOrder(mediator, client.emit.withArgs(clientEvents.END));
        });
    });

    describe('TEST_BEGIN', () => {
        it('should emit "BEGIN_STATE" event for client with correct data', () => {
            const hermione = mkHermione_();
            const testResult = mkHermioneTestResult();

            reportBuilder.getTestBranch.withArgs('some-id').returns('test-tree-branch');

            reportSubscriber(hermione, reportBuilder, client);
            hermione.emit(hermione.events.TEST_BEGIN, testResult);

            assert.calledOnceWith(client.emit, clientEvents.BEGIN_STATE, 'test-tree-branch');
        });
    });

    describe('TEST_PENDING', () => {
        it('should add skipped test result to report', async () => {
            const hermione = mkHermione_();
            const testResult = mkHermioneTestResult();

            reportSubscriber(hermione, reportBuilder, client);
            await hermione.emitAsync(hermione.events.TEST_PENDING, testResult);
            await hermione.emitAsync(hermione.events.RUNNER_END);

            assert.calledOnceWith(reportBuilder.addSkipped, sinon.match({
                fullName: 'some-title',
                browserId: 'some-browser',
                attempt: 0
            }));
        });

        it('should emit "TEST_RESULT" event for client with test data', async () => {
            const hermione = mkHermione_();
            const testResult = mkHermioneTestResult();

            reportBuilder.getTestBranch.withArgs('some-id').returns('test-tree-branch');

            reportSubscriber(hermione, reportBuilder, client);
            await hermione.emitAsync(hermione.events.TEST_PENDING, testResult);
            await hermione.emitAsync(hermione.events.RUNNER_END);

            assert.calledWith(client.emit, clientEvents.TEST_RESULT, 'test-tree-branch');
        });
    });

    describe('TEST_FAIL', () => {
        it('should add correct attempt', async () => {
            const hermione = mkHermione_();
            const testResult = mkHermioneTestResult({assertViewResults: [{name: ErrorName.IMAGE_DIFF}]});

            reportBuilder.getCurrAttempt.returns(1);

            reportSubscriber(hermione, reportBuilder, client);
            hermione.emit(hermione.events.TEST_FAIL, testResult);
            await hermione.emitAsync(hermione.events.RUNNER_END);

            assert.calledWithMatch(reportBuilder.addFail, {attempt: 1});
        });

        it('should save images before fail adding', async () => {
            const hermione = mkHermione_();
            const testResult = mkHermioneTestResult({assertViewResults: [{name: ErrorName.IMAGE_DIFF}]});

            reportSubscriber(hermione, reportBuilder, client);
            hermione.emit(hermione.events.TEST_FAIL, testResult);
            await hermione.emitAsync(hermione.events.RUNNER_END);

            assert.callOrder(reportBuilder.imageHandler.saveTestImages, reportBuilder.addFail);
        });

        it('should emit "TEST_RESULT" event for client with test data', async () => {
            const hermione = mkHermione_();
            const testResult = mkHermioneTestResult();

            reportBuilder.getTestBranch.withArgs('some-id').returns('test-tree-branch');

            reportSubscriber(hermione, reportBuilder, client);
            hermione.emit(hermione.events.TEST_FAIL, testResult);
            await hermione.emitAsync(hermione.events.RUNNER_END);

            assert.calledWith(client.emit, clientEvents.TEST_RESULT, 'test-tree-branch');
        });
    });
});
