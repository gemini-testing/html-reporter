'use strict';

const _ = require('lodash');
const fs = require('fs-extra');
const Promise = require('bluebird');
const QEmitter = require('qemitter');
const proxyquire = require('proxyquire');
const utils = require('../utils');
const ReportBuilder = require('../lib/report-builder-factory/report-builder');
const logger = utils.logger;
const HermioneTestAdapter = require('../lib/test-adapter/hermione-test-adapter');

describe('Hermione Reporter', () => {
    const sandbox = sinon.sandbox.create();
    const parseConfig = sinon.spy(require('../lib/config'));
    let hermione;
    let HermioneReporter;

    const events = {
        TEST_PENDING: 'testPending',
        TEST_PASS: 'testPass',
        TEST_FAIL: 'testFail',
        RETRY: 'retry',
        RUNNER_END: 'runnerEnd'
    };

    function initReporter_(opts, config) {
        opts = _.defaults(opts, {
            enabled: true,
            path: 'default-path',
            baseHost: ''
        });
        hermione = new QEmitter();
        hermione.config = _.defaults(config, {
            forBrowser: sinon.stub().returns({
                rootUrl: 'browser/root/url',
                getAbsoluteUrl: _.noop
            }),
            getBrowserIds: () => ['bro1']
        });
        hermione.events = events;

        HermioneReporter(hermione, opts);
    }

    function mkStubResult_(options = {}) {
        return _.defaultsDeep(options, {err: {type: options.diff && 'ImageDiffError'}});
    }

    beforeEach(() => {
        HermioneReporter = proxyquire('../hermione.js', {
            './lib/config': parseConfig
        });
        sandbox.stub(logger, 'log');
        sandbox.stub(logger, 'warn');

        sandbox.stub(fs, 'mkdirsAsync').returns(Promise.resolve());
        sandbox.stub(fs, 'writeFileAsync').returns(Promise.resolve());
        sandbox.stub(utils, 'copyImageAsync');
        sandbox.stub(utils, 'getCurrentAbsolutePath');
        sandbox.stub(utils, 'getReferenceAbsolutePath');
        sandbox.stub(utils, 'saveDiff');
        sandbox.stub(utils, 'getDiffAbsolutePath');

        sandbox.stub(ReportBuilder.prototype, 'addSkipped');
        sandbox.stub(ReportBuilder.prototype, 'addSuccess');
        sandbox.stub(ReportBuilder.prototype, 'addError');
        sandbox.stub(ReportBuilder.prototype, 'addFail');
        sandbox.stub(ReportBuilder.prototype, 'addRetry');
        sandbox.stub(ReportBuilder.prototype, 'save').resolves({});

        sandbox.spy(ReportBuilder.prototype, 'setStats');
    });

    afterEach(() => sandbox.restore());

    it('should parse config using passed options', () => {
        initReporter_({path: 'some/path', enabled: false, baseHost: 'some-host'});

        assert.calledWith(parseConfig, {path: 'some/path', enabled: false, baseHost: 'some-host'});
    });

    it('should add skipped test to result', () => {
        initReporter_();

        hermione.emit(events.TEST_PENDING, {title: 'some-title'});

        assert.calledOnceWith(ReportBuilder.prototype.addSkipped, {title: 'some-title'});
    });

    it('should add passed test to result', () => {
        initReporter_();

        hermione.emit(events.TEST_PASS, {title: 'some-title'});

        assert.calledOnceWith(ReportBuilder.prototype.addSuccess, {title: 'some-title'});
    });

    ['TEST_FAIL', 'RETRY'].forEach((event) => {
        describe('should add', () => {
            it(`errored test to result on ${event} event`, () => {
                initReporter_();

                hermione.emit(events[event], mkStubResult_({title: 'some-title'}));

                assert.calledOnceWith(ReportBuilder.prototype.addError, sinon.match({title: 'some-title'}));
            });

            it('failed test to result on ${event} event', () => {
                initReporter_();

                hermione.emit(events[event], mkStubResult_({title: 'some-title', diff: true}));

                assert.calledOnceWith(ReportBuilder.prototype.addFail, sinon.match({title: 'some-title'}));
            });
        });
    });

    it('should save statistic', () => {
        initReporter_();

        return hermione.emitAndWait(events.RUNNER_END, {some: 'stat'})
            .then(() => assert.calledOnceWith(ReportBuilder.prototype.setStats, {some: 'stat'}));
    });

    it('should save report', () => {
        initReporter_();

        return hermione.emitAndWait(events.RUNNER_END).then(() => {
            assert.calledOnce(ReportBuilder.prototype.save);
        });
    });

    it('should log correct path to html report', () => {
        ReportBuilder.prototype.save.resolves({reportPath: 'some/path'});
        initReporter_({path: 'some/path'});

        return hermione.emitAndWait(events.RUNNER_END).then(() => {
            assert.calledWithMatch(logger.log, 'some/path');
        });
    });

    it('should save image from error', () => {
        utils.getCurrentAbsolutePath.returns('/absolute/report');

        initReporter_();
        hermione.emit(events.RETRY, {err: {currentImagePath: 'current/path'}});

        return hermione.emitAndWait(events.RUNNER_END).then(() => {
            assert.calledOnceWith(utils.copyImageAsync, 'current/path', '/absolute/report');
        });
    });

    it('should save reference image from fail', () => {
        utils.getReferenceAbsolutePath.returns('/absolute/report');

        initReporter_();
        hermione.emit(events.TEST_FAIL, mkStubResult_({err: {refImagePath: 'reference/path'}, diff: true}));

        return hermione.emitAndWait(events.RUNNER_END).then(() => {
            assert.calledWith(utils.copyImageAsync, 'reference/path', '/absolute/report');
        });
    });

    it('should save current image from fail', () => {
        utils.getCurrentAbsolutePath.returns('/absolute/report');

        initReporter_();
        hermione.emit(events.TEST_FAIL, mkStubResult_({err: {currentImagePath: 'current/path'}, diff: true}));

        return hermione.emitAndWait(events.RUNNER_END).then(() => {
            assert.calledWith(utils.copyImageAsync, 'current/path', '/absolute/report');
        });
    });

    it('should save current diff image from fail', () => {
        utils.getDiffAbsolutePath.returns('/absolute/report');

        initReporter_();
        hermione.emit(events.TEST_FAIL, mkStubResult_({diff: true}));

        return hermione.emitAndWait(events.RUNNER_END).then(() => {
            assert.calledWith(utils.saveDiff, sinon.match.instanceOf(HermioneTestAdapter), '/absolute/report');
        });
    });
});
