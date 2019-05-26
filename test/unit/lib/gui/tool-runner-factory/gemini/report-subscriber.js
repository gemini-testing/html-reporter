'use strict';

const {EventEmitter} = require('events');
const reportSubscriber = require('lib/gui/tool-runner-factory/gemini/report-subscriber');
const ReportBuilder = require('lib/report-builder-factory/report-builder');
const clientEvents = require('lib/gui/constants/client-events');
const {RUNNING} = require('lib/constants/test-statuses');
const {stubTool, stubConfig} = require('../../../../utils');

describe('lib/gui/tool-runner-factory/gemini/report-subscriber', () => {
    const sandbox = sinon.createSandbox();
    let reportBuilder;
    let client;

    const events = {
        END_RUNNER: 'endRunner',
        BEGIN_STATE: 'beginState'
    };

    const mkGemini_ = () => stubTool(stubConfig(), events);

    beforeEach(() => {
        reportBuilder = sinon.createStubInstance(ReportBuilder);
        sandbox.stub(ReportBuilder, 'create').returns(reportBuilder);
        reportBuilder.save.resolves();
        reportBuilder.setApiValues.returns(reportBuilder);

        client = new EventEmitter();
        sandbox.spy(client, 'emit');
    });

    afterEach(() => sandbox.restore());

    describe('END_RUNNER', () => {
        it('should save report', () => {
            const gemini = mkGemini_();

            reportSubscriber(gemini, reportBuilder, client);

            return gemini.emitAndWait(gemini.events.END_RUNNER)
                .then(() => assert.calledOnce(reportBuilder.save));
        });

        it('should emit "END" event for client', () => {
            const gemini = mkGemini_();

            reportSubscriber(gemini, reportBuilder, client);

            return gemini.emitAndWait(gemini.events.END_RUNNER)
                .then(() => assert.calledOnceWith(client.emit, clientEvents.END));
        });
    });

    describe('BEGIN_STATE', () => {
        it('should emit "BEGIN_STATE" event for client with correct data', () => {
            const gemini = mkGemini_();
            const testData = {
                state: {
                    name: 'state-name',
                    suite: {path: ['suite-name']}
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
