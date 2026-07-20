import sinon, {SinonStub} from 'sinon';

import {
    createStaticAccepterClientV2,
    isStaticAccepterPopupBlockedError
} from '@/static/modules/static-accepter-v2';
import type {
    StaticAccepterModule,
    StaticAccepterOptions,
    StaticAccepterResult
} from '@/static/modules/static-accepter-v2';

const MODULE_URL = 'https://static-accepter.my-company.com/v2/script.js';
const IMAGES = [{image: '/actual.png', path: 'screens/expected.png'}];
const OPTIONS: StaticAccepterOptions = {
    message: 'chore: update screenshots',
    theme: 'light',
    config: {
        repositoryUrl: 'https://github.com/org/project',
        pullRequestUrl: 'https://github.com/org/project/pull/42'
    }
};

const mkModule = (defaultExport: SinonStub = sinon.stub().resolves({status: 'submitted'})): StaticAccepterModule => ({
    default: defaultExport
});

describe('lib/static/modules/static-accepter-v2', () => {
    describe('isStaticAccepterPopupBlockedError', () => {
        it('should recognize only the popup-blocked error from static accepter', () => {
            assert.isTrue(isStaticAccepterPopupBlockedError(
                new Error('static accepter confirmation popup was blocked by the browser')
            ));
            assert.isFalse(isStaticAccepterPopupBlockedError(
                new Error('static accepter confirmation popup did not initialize: https://static-accepter.my-company.com/v2/popup.html')
            ));
            assert.isFalse(isStaticAccepterPopupBlockedError('static accepter confirmation popup was blocked by the browser'));
        });
    });

    it('should cache the module promise and loaded module', async () => {
        const module = mkModule();
        const loadModule = sinon.stub().resolves(module);
        const client = createStaticAccepterClientV2(loadModule);

        const firstPreload = client.preload(MODULE_URL);
        const secondPreload = client.preload(MODULE_URL);

        assert.strictEqual(firstPreload, secondPreload);
        assert.strictEqual(await firstPreload, module);
        assert.strictEqual(await client.preload(MODULE_URL), module);
        assert.calledOnce(loadModule);
        assert.calledWithExactly(loadModule, MODULE_URL);
    });

    it('should retry loading after a failed preload', async () => {
        const loadError = new Error('network failed');
        const module = mkModule();
        const loadModule = sinon.stub()
            .onFirstCall().rejects(loadError)
            .onSecondCall().resolves(module);
        const client = createStaticAccepterClientV2(loadModule);

        await assert.isRejected(client.preload(MODULE_URL), loadError.message);

        assert.strictEqual(await client.preload(MODULE_URL), module);
        assert.calledTwice(loadModule);
    });

    it('should reject a module without a default export and allow retry', async () => {
        const module = mkModule();
        const loadModule = sinon.stub()
            .onFirstCall().resolves({})
            .onSecondCall().resolves(module);
        const client = createStaticAccepterClientV2(loadModule);

        await assert.isRejected(client.preload(MODULE_URL), 'Static Accepter module has no default export');

        assert.strictEqual(await client.preload(MODULE_URL), module);
    });

    it('should call the module synchronously and prevent concurrent operations', async () => {
        let resolveOperation: (result: StaticAccepterResult) => void = () => undefined;
        const operation = new Promise<StaticAccepterResult>((resolve) => {
            resolveOperation = resolve;
        });
        const defaultExport = sinon.stub().returns(operation);
        const client = createStaticAccepterClientV2(sinon.stub().resolves(mkModule(defaultExport)));
        await client.preload(MODULE_URL);

        const resultPromise = client.start(MODULE_URL, IMAGES, OPTIONS);

        assert.calledOnce(defaultExport);
        assert.calledWithExactly(defaultExport, IMAGES, OPTIONS);
        assert.throws(
            () => client.start(MODULE_URL, IMAGES, OPTIONS),
            'Static Accepter operation is already in progress'
        );

        const result: StaticAccepterResult = {status: 'submitted'};
        resolveOperation(result);
        assert.deepEqual(await resultPromise, result);

        await client.start(MODULE_URL, IMAGES, OPTIONS);
        assert.calledTwice(defaultExport);
    });

    it('should reset the operation lock when the module throws synchronously', async () => {
        const defaultExport = sinon.stub()
            .onFirstCall().throws(new Error('popup blocked'))
            .onSecondCall().resolves({status: 'cancelled'});
        const client = createStaticAccepterClientV2(sinon.stub().resolves(mkModule(defaultExport)));
        await client.preload(MODULE_URL);

        assert.throws(() => client.start(MODULE_URL, IMAGES, OPTIONS), 'popup blocked');
        assert.deepEqual(await client.start(MODULE_URL, IMAGES, OPTIONS), {status: 'cancelled'});
    });

    it('should not start before the requested module is loaded', () => {
        const client = createStaticAccepterClientV2(sinon.stub().resolves(mkModule()));

        assert.throws(
            () => client.start(MODULE_URL, IMAGES, OPTIONS),
            'Static Accepter module is not loaded yet'
        );
    });
});
