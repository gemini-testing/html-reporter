import proxyquire from 'proxyquire';
import sinon from 'sinon';

import type * as StaticImageAccepter from '@/static/modules/static-image-accepter';

const loadModule = (): typeof StaticImageAccepter => proxyquire.noPreserveCache()('lib/static/modules/static-image-accepter', {});

describe('lib/static/modules/static-image-accepter', () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => sandbox.restore());

    it('should enable v2 without a legacy serviceUrl', () => {
        const {checkIsEnabled} = loadModule();

        assert.isTrue(checkIsEnabled({
            enabled: true,
            repositoryUrl: 'https://github.com/org/project',
            pullRequestUrl: 'https://github.com/org/project/pull/42',
            moduleUrl: 'https://static-accepter.my-company.com/v2/script.js',
            meta: {}
        }, false));
    });

    it('should continue requiring serviceUrl when moduleUrl is absent', () => {
        const {checkIsEnabled} = loadModule();
        const consoleError = sandbox.stub(console, 'error');

        assert.isFalse(checkIsEnabled({
            enabled: true,
            repositoryUrl: 'https://github.com/org/project',
            pullRequestUrl: 'https://github.com/org/project/pull/42',
            meta: {}
        }, false));
        assert.calledOnce(consoleError);
        assert.calledWithExactly(
            consoleError,
            'staticImageAccepter is disabled. Invalid config: \'serviceUrl\' is(/are) missing!'
        );
    });
});
