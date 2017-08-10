'use strict';

const path = require('path');
const _ = require('lodash');
const fs = require('fs-extra');
const Promise = require('bluebird');
const QEmitter = require('qemitter');
const Handlebars = require('handlebars');
const chalk = require('chalk');
const proxyquire = require('proxyquire');
const utils = require('../utils');
const view = require('../lib/view');
const ViewModel = require('../lib/view-model');
const logger = require('../utils').logger;

describe('HTML Reporter', () => {
    const sandbox = sinon.sandbox.create();
    const parseConfig = sinon.spy(require('../lib/config'));
    let emitter;
    let HtmlReporter;

    const events = {
        END_RUNNER: 'endRunner',
        END: 'end',
        RETRY: 'retry',
        SKIP_STATE: 'skipState',
        ERROR: 'err',
        TEST_RESULT: 'testResult',
        UPDATE_RESULT: 'updateResult'
    };

    function initReporter_(opts) {
        opts = _.defaults(opts || {}, {
            enabled: true,
            path: 'default-path'
        });
        emitter = new QEmitter();
        emitter.config = {
            forBrowser: sinon.stub().returns({
                rootUrl: 'browser/root/url',
                getAbsoluteUrl: _.noop
            })
        };
        emitter.events = events;

        HtmlReporter(emitter, opts);
    }

    function mkStubResult_(options) {
        return _.defaultsDeep(options, {
            state: {name: 'name-default'},
            browserId: 'browserId-default',
            suite: {
                path: ['suite/path-default'],
                metaInfo: {sessionId: 'sessionId-default'}
            },
            saveDiffTo: sandbox.stub(),
            currentPath: 'current/path-default',
            referencePath: 'reference/path-default',
            equal: false
        });
    }

    beforeEach(() => {
        HtmlReporter = proxyquire('../index.js', {
            './lib/config': parseConfig
        });
        sandbox.stub(view, 'save');
        sandbox.stub(view, 'createHtml').returns(Promise.resolve());
        sandbox.stub(logger, 'log');
        sandbox.stub(fs, 'copyAsync').returns(Promise.resolve());
        sandbox.stub(fs, 'mkdirsAsync').returns(Promise.resolve());

        initReporter_();
    });

    afterEach(() => sandbox.restore());

    it('should parse config using passed options', () => {
        initReporter_({path: 'some/path', enabled: false});
        emitter.emit(events.END);

        return emitter.emitAndWait(events.END_RUNNER).then(() => {
            assert.calledWith(parseConfig, {path: 'some/path', enabled: false});
        });
    });

    it('should save report using passed path', () => {
        initReporter_({path: 'some/path'});
        view.createHtml.returns(Promise.resolve('some-html'));
        emitter.emit(events.END);

        return emitter.emitAndWait(events.END_RUNNER).then(() => {
            assert.calledWith(view.save, 'some-html', 'some/path');
        });
    });

    it('should log correct path to html report', () => {
        initReporter_({path: 'some/path'});
        emitter.emit(events.END);

        return emitter.emitAndWait(events.END_RUNNER).then(() => {
            const reportPath = `file://${path.resolve('some/path/index.html')}`;
            assert.calledWith(logger.log, `Your HTML report is here: ${chalk.yellow(reportPath)}`);
        });
    });

    it('should escape special chars in urls', () => {
        const data = {
            actualPath: 'images/fake/long+path/fakeName/fakeId~current.png'
        };

        const render = Handlebars.compile('{{image "actual"}}');

        assert.equal(render(data), '<img data-src="images/fake/long%2Bpath/fakeName/fakeId~current.png">');
    });

    it('should save only reference when screenshots are equal', () => {
        sandbox.stub(utils, 'getReferenceAbsolutePath').returns('absolute/reference/path');

        emitter.emit(events.TEST_RESULT, mkStubResult_({
            referencePath: 'reference/path',
            equal: true
        }));

        emitter.emit(events.END);

        return emitter.emitAndWait(events.END_RUNNER).then(() => {
            assert.calledOnce(fs.copyAsync);
            assert.calledWith(fs.copyAsync, 'reference/path', 'absolute/reference/path');
        });
    });

    it('should handle updated references as success result', () => {
        sandbox.stub(ViewModel.prototype, 'addSuccess');
        emitter.emit(events.UPDATE_RESULT, mkStubResult_({updated: true}));

        assert.calledOnce(ViewModel.prototype.addSuccess);
        assert.calledWith(ViewModel.prototype.addSuccess, sinon.match({updated: true}));
    });

    it('should save updated images', () => {
        sandbox.stub(utils, 'getReferenceAbsolutePath').returns('absolute/reference/path');

        emitter.emit(events.UPDATE_RESULT, mkStubResult_({
            imagePath: 'updated/image/path'
        }));

        emitter.emit(events.END);

        return emitter.emitAndWait(events.END_RUNNER).then(() => {
            assert.calledOnce(fs.copyAsync);
            assert.calledWith(fs.copyAsync, 'updated/image/path', 'absolute/reference/path');
        });
    });

    describe('when screenshots are not equal', () => {
        function emitResult_(options) {
            emitter.emit(events.TEST_RESULT, mkStubResult_(options));
            emitter.emit(events.END);
            return emitter.emitAndWait(events.END_RUNNER);
        }

        it('should save current image', () => {
            sandbox.stub(utils, 'getCurrentAbsolutePath').returns('/absolute/report/current/path');

            return emitResult_({currentPath: 'current/path'})
                .then(() => {
                    assert.calledWith(fs.copyAsync, 'current/path', '/absolute/report/current/path');
                });
        });

        it('should save reference image', () => {
            sandbox.stub(utils, 'getReferenceAbsolutePath').returns('/absolute/report/reference/path');

            return emitResult_({referencePath: 'reference/path'})
                .then(() => {
                    assert.calledWith(fs.copyAsync, 'reference/path', '/absolute/report/reference/path');
                });
        });

        it('should save diff image', () => {
            const saveDiffTo = sandbox.stub();

            sandbox.stub(utils, 'getDiffAbsolutePath').returns('/absolute/report/diff/path');

            return emitResult_({saveDiffTo})
                .then(() => {
                    assert.calledWith(saveDiffTo, '/absolute/report/diff/path');
                });
        });
    });
});
