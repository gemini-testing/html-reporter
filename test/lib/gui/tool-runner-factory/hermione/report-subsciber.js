'use strict';

const {EventEmitter} = require('events');
const reportSubscriber = require('lib/gui/tool-runner-factory/hermione/report-subscriber');
const ReportBuilder = require('lib/report-builder-factory/report-builder');
const clientEvents = require('lib/gui/constants/client-events');
const {RUNNING} = require('lib/constants/test-statuses');
const {stubTool, stubConfig} = require('test/utils');

describe('lib/gui/tool-runner-factory/hermione/report-subscriber', () => {
    const sandbox = sinon.createSandbox();
    let reportBuilder;
    let client;

    const events = {
        RUNNER_END: 'runnerEnd',
        TEST_BEGIN: 'testBegin'
    };

    const mkHermione_ = () => stubTool(stubConfig(), events);

    beforeEach(() => {
        reportBuilder = sinon.createStubInstance(ReportBuilder);
        sandbox.stub(ReportBuilder, 'create').returns(reportBuilder);
        reportBuilder.save.resolves();

        client = new EventEmitter();
        sandbox.spy(client, 'emit');
    });

    afterEach(() => sandbox.restore());

    describe('RUNNER_END', () => {
        it('should save report', () => {
            const hermione = mkHermione_();

            reportSubscriber(hermione, reportBuilder, client);

            return hermione.emitAndWait(hermione.events.RUNNER_END)
                .then(() => assert.calledOnce(reportBuilder.save));
        });

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
});
