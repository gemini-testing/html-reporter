'use strict';

const {EventEmitter} = require('events');
const proxyquire = require('proxyquire');

const {ClientEvents} = require('lib/gui/constants');
const {logger} = require('lib/common-utils');

describe('lib/gui/tests-watcher', () => {
    const sandbox = sinon.createSandbox();
    let chokidar;
    let watchers;
    let TestsWatcher;
    let app;

    beforeEach(() => {
        watchers = [new EventEmitter(), new EventEmitter()];
        watchers.forEach(watcher => {
            watcher.close = sandbox.stub().resolves();
        });
        chokidar = {watch: sandbox.stub()};
        chokidar.watch.onFirstCall().returns(watchers[0]);
        chokidar.watch.onSecondCall().returns(watchers[1]);
        TestsWatcher = proxyquire('lib/gui/tests-watcher', {chokidar}).TestsWatcher;
        app = {
            refreshTestsIfChanged: sandbox.stub().resolves(),
            sendClientEvent: sandbox.stub()
        };
        sandbox.stub(logger, 'error');
    });

    afterEach(() => sandbox.restore());

    it('should subscribe to paths and directory roots from adapter watch plan', () => {
        const watcher = TestsWatcher.create({
            app,
            plan: {paths: ['tests/**/*.ts'], roots: ['tests']},
            reportPath: 'html-report'
        });

        watcher.start();

        assert.calledWith(chokidar.watch.firstCall, ['tests/**/*.ts']);
        assert.calledWith(chokidar.watch.secondCall, ['tests']);
    });

    it('should report a contextual error without throwing from chokidar event', () => {
        const watcher = TestsWatcher.create({
            app,
            plan: {paths: ['tests/**/*.ts'], roots: ['tests']},
            reportPath: 'html-report'
        });
        watcher.start();

        watchers[0].emit('error', new Error('permission denied'));

        assert.calledOnceWith(app.sendClientEvent, ClientEvents.TESTS_REFRESH_FAILED, undefined);
        assert.calledOnceWith(logger.error, 'Test tree watcher error (test files): permission denied');
    });

    it('should close both file system watchers', () => {
        const watcher = TestsWatcher.create({
            app,
            plan: {paths: ['tests/**/*.ts'], roots: ['tests']},
            reportPath: 'html-report'
        });
        watcher.start();

        watcher.close();

        assert.calledOnce(watchers[0].close);
        assert.calledOnce(watchers[1].close);
    });
});
