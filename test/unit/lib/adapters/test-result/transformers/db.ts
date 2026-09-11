import {DbTestResultTransformer} from 'lib/adapters/test-result/transformers/db';
import type {ReporterTestResult} from 'lib/adapters/test-result';
import {ERROR} from 'lib/constants';

describe('DbTestResultTransformer', () => {
    it('should preserve non-object image info', () => {
        const testResult = {
            testPath: ['suite'],
            browserId: 'chrome',
            meta: {},
            file: 'test.ts',
            sessionId: 'session-id',
            history: [],
            imagesInfo: ['some-images'],
            multipleTabs: true,
            status: ERROR,
            timestamp: 1,
            duration: 1,
            attachments: []
        } as unknown as ReporterTestResult;

        const result = new DbTestResultTransformer({}).transform(testResult);

        assert.deepEqual(result.imagesInfo, ['some-images']);
    });

    it('should format an error stack inside image info', () => {
        const stack = [
            'NoRefImageError: can not find reference image at /reference/image.png',
            '    at assertView (/path/to/assert-view.ts:1:1)'
        ].join('\n');
        const testResult = {
            testPath: ['suite'],
            browserId: 'chrome',
            meta: {},
            file: 'test.ts',
            sessionId: 'session-id',
            history: [],
            imagesInfo: [{
                status: ERROR,
                stateName: 'plain',
                actualImg: {path: '/actual/image.png'},
                error: {
                    name: 'NoRefImageError',
                    message: 'can not find reference image at /reference/image.png',
                    stack
                }
            }],
            multipleTabs: true,
            status: ERROR,
            timestamp: 1,
            duration: 1,
            attachments: []
        } as ReporterTestResult;

        const result = new DbTestResultTransformer({}).transform(testResult);
        const imageInfo = result.imagesInfo[0];

        assert.equal(
            'error' in imageInfo && imageInfo.error?.stack,
            'NoRefImageError: can not find reference image at /reference/image.png'
        );
    });
});
