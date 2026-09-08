import {EventEmitter} from 'events';
import type {Express} from 'express';
import sinon from 'sinon';
import {listenWithFallback} from 'lib/gui/listen-with-fallback';

describe('listenWithFallback', () => {
    it('should try the next port when the listen callback receives EADDRINUSE', async () => {
        const listen = sinon.stub().callsFake((port: number, _hostname: string, callback: (error?: NodeJS.ErrnoException) => void) => {
            process.nextTick(() => {
                if (port === 3000) {
                    callback(Object.assign(new Error('Port is busy'), {code: 'EADDRINUSE'}));
                } else {
                    callback();
                }
            });
            return new EventEmitter();
        });

        const result = await listenWithFallback({server: {listen} as unknown as Express, hostname: 'localhost', requestedPort: 3000});

        assert.deepEqual(result, {actualPort: 3001, hostnameForUrl: 'localhost'});
    });

    it('should reject when the listen callback receives an error other than EADDRINUSE', async () => {
        const error = Object.assign(new Error('Permission denied'), {code: 'EACCES'});
        const listen = sinon.stub().callsFake((_port: number, callback: (error?: NodeJS.ErrnoException) => void) => {
            process.nextTick(() => callback(error));
            return new EventEmitter();
        });

        await assert.isRejected(listenWithFallback({server: {listen} as unknown as Express}), 'Permission denied');
    });
});
