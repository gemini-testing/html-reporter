'use strict';

const {EventEmitter} = require('events');
const Promise = require('bluebird');
const _ = require('lodash');
const {subscribeOnToolEvents} = require('lib/gui/tool-runner/report-subscriber');
const {GuiReportBuilder} = require('lib/report-builder/gui');
const {ClientEvents} = require('lib/gui/constants');
const {stubTool, stubConfig} = require('test/unit/utils');
const {HermioneTestAdapter} = require('lib/test-adapter/hermione');
const {UNKNOWN_ATTEMPT} = require('lib/constants');

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
        reportBuilder.addTestResult.callsFake(_.identity);

        sandbox.stub(GuiReportBuilder, 'create').returns(reportBuilder);
        sandbox.stub(HermioneTestAdapter.prototype, 'id').value('some-id');

        client = new EventEmitter();
        sandbox.spy(client, 'emit');
    });

    afterEach(() => sandbox.restore());

    describe('RUNNER_END', () => {
        it('should emit "END" event for client', () => {
            const hermione = mkHermione_();

            subscribeOnToolEvents(hermione, reportBuilder, client);

            return hermione.emitAsync(hermione.events.RUNNER_END)
                .then(() => assert.calledOnceWith(client.emit, ClientEvents.END));
        });

        it('should emit "END" event after all promises are resolved', async () => {
            const hermione = mkHermione_();
            const testResult = mkHermioneTestResult();
            const mediator = sinon.spy().named('mediator');

            reportBuilder.addTestResult.callsFake(() => Promise.delay(100).then(mediator).then(() => ({id: 'some-id'})));

            subscribeOnToolEvents(hermione, reportBuilder, client);
            hermione.emit(hermione.events.TEST_FAIL, testResult);
            await hermione.emitAsync(hermione.events.RUNNER_END);

            assert.callOrder(mediator, client.emit.withArgs(ClientEvents.END));
        });
    });

    describe('TEST_BEGIN', () => {
        it('should emit "BEGIN_STATE" event for client with correct data', async () => {
            const hermione = mkHermione_();
            const testResult = mkHermioneTestResult();

            reportBuilder.addTestResult.resolves({id: 'some-id'});
            reportBuilder.getTestBranch.withArgs('some-id').returns('test-tree-branch');

            subscribeOnToolEvents(hermione, reportBuilder, client);
            hermione.emit(hermione.events.TEST_BEGIN, testResult);
            await hermione.emitAsync(hermione.events.RUNNER_END);

            assert.calledWith(client.emit, ClientEvents.BEGIN_STATE, 'test-tree-branch');
        });
    });

    describe('TEST_PENDING', () => {
        it('should add skipped test result to report', async () => {
            const hermione = mkHermione_();
            const testResult = mkHermioneTestResult();

            subscribeOnToolEvents(hermione, reportBuilder, client);
            await hermione.emitAsync(hermione.events.TEST_PENDING, testResult);
            await hermione.emitAsync(hermione.events.RUNNER_END);

            assert.calledOnceWith(reportBuilder.addTestResult, sinon.match({
                fullName: 'some-title',
                browserId: 'some-browser',
                attempt: UNKNOWN_ATTEMPT
            }));
        });

        it('should emit "TEST_RESULT" event for client with test data', async () => {
            const hermione = mkHermione_();
            const testResult = mkHermioneTestResult();

            reportBuilder.getTestBranch.withArgs('some-id').returns('test-tree-branch');

            subscribeOnToolEvents(hermione, reportBuilder, client);
            await hermione.emitAsync(hermione.events.TEST_PENDING, testResult);
            await hermione.emitAsync(hermione.events.RUNNER_END);

            assert.calledWith(client.emit, ClientEvents.TEST_RESULT, 'test-tree-branch');
        });
    });

    describe('TEST_FAIL', () => {
        it('should emit "TEST_RESULT" event for client with test data', async () => {
            const hermione = mkHermione_();
            const testResult = mkHermioneTestResult();

            reportBuilder.getTestBranch.withArgs('some-id').returns('test-tree-branch');

            subscribeOnToolEvents(hermione, reportBuilder, client);
            hermione.emit(hermione.events.TEST_FAIL, testResult);
            await hermione.emitAsync(hermione.events.RUNNER_END);

            assert.calledWith(client.emit, ClientEvents.TEST_RESULT, 'test-tree-branch');
        });
    });
});
