'use strict';

const {TestAttemptManager} = require('lib/test-attempt-manager');
const {FAIL, SUCCESS} = require('lib/constants');

describe('TestAttemptManager', () => {
    it('should replace all attempts for a test', () => {
        const manager = new TestAttemptManager();
        const test = {fullName: 'test', browserId: 'chrome'};
        manager.registerAttempt(test, SUCCESS);
        manager.registerAttempt(test, FAIL);

        manager.replaceAttempts(test, [SUCCESS]);

        assert.equal(manager.getCurrentAttempt(test), 0);
        assert.equal(manager.registerAttempt(test, FAIL), 1);
    });

    it('should remove attempts for a test when replacing with an empty list', () => {
        const manager = new TestAttemptManager();
        const test = {fullName: 'test', browserId: 'chrome'};
        manager.registerAttempt(test, SUCCESS);

        manager.replaceAttempts(test, []);

        assert.equal(manager.registerAttempt(test, FAIL), 0);
    });

    it('should restore attempts only for snapshotted tests', () => {
        const manager = new TestAttemptManager();
        const existing = {fullName: 'existing test', browserId: 'chrome'};
        const added = {fullName: 'added test', browserId: 'chrome'};
        manager.registerAttempt(existing, SUCCESS);
        const snapshot = manager.snapshot([existing, added]);

        manager.registerAttempt(existing, FAIL);
        manager.registerAttempt(added, FAIL);
        manager.restore(snapshot);

        assert.equal(manager.getCurrentAttempt(existing), 0);
        assert.equal(manager.registerAttempt(existing, FAIL), 1);
        assert.equal(manager.registerAttempt(added, SUCCESS), 0);
    });
});
