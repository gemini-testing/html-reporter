'use strict';

const _ = require('lodash');
const fs = require('fs-extra');
const Promise = require('bluebird');
const QEmitter = require('qemitter');
const proxyquire = require('proxyquire');
const utils = require('../utils');
const ReportBuilder = require('../lib/report-builder-factory/report-builder');
const logger = utils.logger;

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

    function mkStubResult_(options) {
        return _.defaultsDeep(options, {err: {}});
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

        sandbox.stub(ReportBuilder.prototype, 'addSkipped');
        sandbox.stub(ReportBuilder.prototype, 'addSuccess');
        sandbox.stub(ReportBuilder.prototype, 'addError');
        sandbox.stub(ReportBuilder.prototype, 'addRetry');
        sandbox.stub(ReportBuilder.prototype, 'save').resolves({});

        sandbox.spy(ReportBuilder.prototype, 'setStats');

        initReporter_();
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

    it('should add failed test to result', () => {
        initReporter_();

        hermione.emit(events.TEST_FAIL, mkStubResult_({title: 'some-title'}));

        assert.calledOnceWith(ReportBuilder.prototype.addError, sinon.match({title: 'some-title'}));
    });

    it('should add retried test to result', () => {
        initReporter_();

        hermione.emit(events.RETRY, mkStubResult_({title: 'some-title'}));

        assert.calledOnceWith(ReportBuilder.prototype.addRetry, sinon.match({title: 'some-title'}));
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
        utils.getCurrentAbsolutePath.returns('/absolute/path');

        initReporter_();
        hermione.emit(events.RETRY, {err: {currentImagePath: 'image/path'}});

        return hermione.emitAndWait(events.RUNNER_END).then(() => {
            assert.calledOnceWith(utils.copyImageAsync, 'image/path', '/absolute/path');
        });
    });

    describe('screenshotOnReject', () => {
        const eventsMap = {retry: events.RETRY, fail: events.TEST_FAIL};

        _.forEach(eventsMap, (value, key) => {
            it(`should save screenshot from error if error does not contain image in case of ${key}`, () => {
                utils.getCurrentAbsolutePath.returns('/absolute/path');

                initReporter_();

                hermione.emit(value, {err: {screenshot: 'some-buffer'}});
                const buffer = new Buffer('some-buffer', 'base64');

                return hermione.emitAndWait(events.RUNNER_END).then(() => {
                    assert.calledOnceWith(fs.writeFileAsync, '/absolute/path', buffer, 'base64');
                });
            });

            it(`should warn if error does not contain screenshot in case of ${key}`, () => {
                initReporter_();
                hermione.emit(value, mkStubResult_());

                return hermione.emitAndWait(events.RUNNER_END).then(() => {
                    assert.calledOnceWith(utils.logger.warn, 'Cannot save screenshot on reject');
                });
            });
        });
    });
});
