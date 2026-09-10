'use strict';

const {TestAttemptManager} = require('lib/test-attempt-manager');
const {FAIL, SUCCESS} = require('lib/constants');

describe('TestAttemptManager', () => {
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
