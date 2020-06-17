'use strict';

const {EventEmitter} = require('events');
const proxyquire = require('proxyquire');
const ReportBuilder = require('lib/report-builder/report-builder-sqlite');
const clientEvents = require('lib/gui/constants/client-events');
const {RUNNING} = require('lib/constants/test-statuses');
const utils = require('lib/gui/tool-runner/utils');
const commonUtils = require('lib/common-utils');
const {stubTool, stubConfig} = require('test/unit/utils');

describe('lib/gui/tool-runner/hermione/report-subscriber', () => {
    const sandbox = sinon.createSandbox();
    let reportBuilder;
    let client;
    let reportSubscriber;

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
        reportBuilder = sinon.createStubInstance(ReportBuilder);
        sandbox.stub(ReportBuilder, 'create').returns(reportBuilder);
        reportBuilder.format.returns(mkTestAdapterStub_());
        reportBuilder.setApiValues.returns(reportBuilder);
        reportBuilder.setBrowsers.returns(reportBuilder);
        sandbox.stub(utils, 'findTestResult');

        const findTestResult = sandbox.stub();
        reportSubscriber = proxyquire('lib/gui/tool-runner/report-subscriber', {
            '../utils': {
                findTestResult
            }
        });

        client = new EventEmitter();
        sandbox.spy(client, 'emit');
    });

    afterEach(() => sandbox.restore());

    describe('RUNNER_END', () => {
        it('should emit "END" event for client', () => {
            const hermione = mkHermione_();

            reportSubscriber(hermione, reportBuilder, client);

            return hermione.emitAndWait(hermione.events.RUNNER_END)
                .then(() => assert.calledOnceWith(client.emit, clientEvents.END));
        });
    });

    describe('TEST_BEGIN', () => {
        it('should emit "BEGIN_STATE" event for client with correct data', () => {
            const hermione = mkHermione_();
            const testData = {
                title: 'suite-title',
                parent: {title: 'root-title', parent: {root: true}},
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

    describe('TEST_RESULT', () => {
        it('should add skipped test result to report', async () => {
            const hermione = mkHermione_();

            reportSubscriber(hermione, reportBuilder, client);
            reportBuilder.format.withArgs({foo: 'bar'}).returns(mkTestAdapterStub_({formatted: 'res'}));
            hermione.emit(hermione.events.TEST_PENDING, {foo: 'bar'});
            await hermione.emitAndWait(hermione.events.RUNNER_END);

            assert.calledOnceWith(reportBuilder.addSkipped, sinon.match({formatted: 'res'}));
        });

        it('should emit "TEST_RESULT" for client with test data', async () => {
            const hermione = mkHermione_();
            utils.findTestResult.returns({name: 'foo'});

            reportSubscriber(hermione, reportBuilder, client);
            await hermione.emitAndWait(hermione.events.TEST_PENDING, {});

            assert.calledOnceWith(client.emit, clientEvents.TEST_RESULT, {name: 'foo'});
        });
    });

    describe('TEST_FAIL', () => {
        it('should add correct attempt', async () => {
            const hermione = mkHermione_();
            reportBuilder.getCurrAttempt.returns(1);

            reportSubscriber(hermione, reportBuilder, client, '');
            hermione.emit(hermione.events.TEST_FAIL, {});
            await hermione.emitAndWait(hermione.events.RUNNER_END, {});

            assert.calledWithMatch(reportBuilder.addFail, {attempt: 1});
        });

        it('should save images before fail adding', async () => {
            const hermione = mkHermione_();
            const formattedResult = mkTestAdapterStub_({saveTestImages: sandbox.stub()});

            reportBuilder.format.withArgs({some: 'res'}).returns(formattedResult);
            reportSubscriber(hermione, reportBuilder, client, '');
            hermione.emit(hermione.events.TEST_FAIL, {some: 'res'});
            await hermione.emitAndWait(hermione.events.RUNNER_END);

            assert.callOrder(formattedResult.saveTestImages, reportBuilder.addFail);
        });
    });

    describe('AFTER_TESTS_READ', () => {
        it('should set browsers to the report builder', async () => {
            const hermione = mkHermione_();
            const collection = sandbox.stub();
            const formatedBrowsers = [{id: 'bro1'}];

            sandbox.stub(commonUtils, 'formatBrowsers').returns(formatedBrowsers);
            reportSubscriber(hermione, reportBuilder, client, '');
            hermione.emit(hermione.events.AFTER_TESTS_READ, collection);

            assert.calledOnceWith(commonUtils.formatBrowsers, collection);
            assert.calledOnceWith(reportBuilder.setBrowsers, formatedBrowsers);
        });
    });
});
