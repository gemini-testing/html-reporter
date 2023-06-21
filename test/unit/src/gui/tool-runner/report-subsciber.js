'use strict';

const {EventEmitter} = require('events');
const Promise = require('bluebird');
const reportSubscriber = require('src/gui/tool-runner/report-subscriber');
const GuiReportBuilder = require('src/report-builder/gui');
const clientEvents = require('src/gui/constants/client-events');
const {RUNNING} = require('src/constants/test-statuses');
const {stubTool, stubConfig} = require('test/unit/utils');

describe('src/gui/tool-runner/hermione/report-subscriber', () => {
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

    const mkTestAdapterStub_ = (opts = {}) => (Object.assign({
        prepareTestResult: () => ({suitePath: ['']}),
        saveTestImages: () => ({}),
        hasDiff: () => ({})
    }, opts));

    beforeEach(() => {
        reportBuilder = sinon.createStubInstance(GuiReportBuilder);
        sandbox.stub(GuiReportBuilder, 'create').returns(reportBuilder);
        reportBuilder.format.returns(mkTestAdapterStub_());

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
            const testResult = 'test-result';
            const mediator = sinon.spy().named('mediator');
            const saveTestImages = sandbox.stub().callsFake(() => Promise.delay(100).then(mediator));

            const formattedResult = mkTestAdapterStub_({saveTestImages});
            reportBuilder.format.withArgs(testResult, hermione.events.TEST_FAIL).returns(formattedResult);

            reportSubscriber(hermione, reportBuilder, client);
            hermione.emit(hermione.events.TEST_FAIL, testResult);
            await hermione.emitAsync(hermione.events.RUNNER_END);

            assert.callOrder(mediator, client.emit.withArgs(clientEvents.END));
        });
    });

    describe('TEST_BEGIN', () => {
        it('should emit "BEGIN_STATE" event for client with correct data', () => {
            const hermione = mkHermione_();
            const testData = 'test-data';
            const formattedResult = mkTestAdapterStub_({id: 'some-id'});

            reportBuilder.format.withArgs(testData, RUNNING).returns(formattedResult);
            reportBuilder.getTestBranch.withArgs('some-id').returns('test-tree-branch');

            reportSubscriber(hermione, reportBuilder, client);
            hermione.emit(hermione.events.TEST_BEGIN, testData);

            assert.calledOnceWith(client.emit, clientEvents.BEGIN_STATE, 'test-tree-branch');
        });
    });

    describe('TEST_PENDING', () => {
        it('should add skipped test result to report', async () => {
            const hermione = mkHermione_();
            const testData = 'test-data';
            const formattedResult = mkTestAdapterStub_();
            reportBuilder.format.withArgs(testData, hermione.events.TEST_PENDING).returns(formattedResult);

            reportSubscriber(hermione, reportBuilder, client);
            hermione.emitAsync(hermione.events.TEST_PENDING, testData);
            await hermione.emitAsync(hermione.events.RUNNER_END);

            assert.calledOnceWith(reportBuilder.addSkipped, formattedResult);
        });

        it('should emit "TEST_RESULT" event for client with test data', async () => {
            const hermione = mkHermione_();
            const testData = 'test-data';
            const formattedResult = mkTestAdapterStub_({id: 'some-id'});

            reportBuilder.format.withArgs(testData, hermione.events.TEST_PENDING).returns(formattedResult);
            reportBuilder.getTestBranch.withArgs('some-id').returns('test-tree-branch');

            reportSubscriber(hermione, reportBuilder, client);
            hermione.emitAsync(hermione.events.TEST_PENDING, testData);
            await hermione.emitAsync(hermione.events.RUNNER_END);

            assert.calledWith(client.emit, clientEvents.TEST_RESULT, 'test-tree-branch');
        });
    });

    describe('TEST_FAIL', () => {
        it('should add correct attempt', async () => {
            const hermione = mkHermione_();
            const testData = 'test-data';
            const formattedResult = mkTestAdapterStub_();

            reportBuilder.format.withArgs(testData, hermione.events.TEST_FAIL).returns(formattedResult);
            reportBuilder.getCurrAttempt.withArgs(formattedResult).returns(1);

            reportSubscriber(hermione, reportBuilder, client);
            hermione.emit(hermione.events.TEST_FAIL, testData);
            await hermione.emitAsync(hermione.events.RUNNER_END);

            assert.calledWithMatch(reportBuilder.addFail, {attempt: 1});
        });

        it('should save images before fail adding', async () => {
            const hermione = mkHermione_();
            const testData = 'test-data';
            const formattedResult = mkTestAdapterStub_({saveTestImages: sandbox.stub()});

            reportBuilder.format.withArgs(testData, hermione.events.TEST_FAIL).returns(formattedResult);

            reportSubscriber(hermione, reportBuilder, client);
            hermione.emit(hermione.events.TEST_FAIL, testData);
            await hermione.emitAsync(hermione.events.RUNNER_END);

            assert.callOrder(formattedResult.saveTestImages, reportBuilder.addFail);
        });

        it('should emit "TEST_RESULT" event for client with test data', async () => {
            const hermione = mkHermione_();
            const testData = 'test-data';
            const formattedResult = mkTestAdapterStub_({id: 'some-id'});

            reportBuilder.format.withArgs(testData, hermione.events.TEST_FAIL).returns(formattedResult);
            reportBuilder.getTestBranch.withArgs('some-id').returns('test-tree-branch');

            reportSubscriber(hermione, reportBuilder, client);
            hermione.emit(hermione.events.TEST_FAIL, testData);
            await hermione.emitAsync(hermione.events.RUNNER_END);

            assert.calledWith(client.emit, clientEvents.TEST_RESULT, 'test-tree-branch');
        });
    });
});
