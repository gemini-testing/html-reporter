import axios from 'axios';
import proxyquire from 'proxyquire';
import sinon, {SinonStub} from 'sinon';

import actionNames from '@/static/modules/action-names';
import type * as StaticAccepterActions from '@/static/modules/actions/static-accepter';
import type {
    StaticAccepterOptions,
    StaticAccepterProgress,
    StaticAccepterResult
} from '@/static/modules/static-accepter-v2';

const MODULE_URL = 'https://static-accepter.my-company.com/v2/script.js';
const IMAGES = [{
    id: 'image-1',
    stateNameImageId: 'browser state',
    image: '/actual.png',
    path: 'screens/expected.png'
}];
const BASE_OPTIONS = {
    repositoryUrl: 'https://github.com/org/project',
    pullRequestUrl: 'https://github.com/org/project/pull/42',
    serviceUrl: 'https://static-accepter.my-company.com/v2/script.js',
    moduleUrl: MODULE_URL,
    axiosRequestOptions: {},
    meta: {},
    message: 'chore: update screenshots'
};

describe('lib/static/modules/actions/static-accepter', () => {
    const sandbox = sinon.createSandbox();
    let actions: typeof StaticAccepterActions;
    let dispatch: SinonStub;
    let startStaticAccepter: SinonStub;
    let storeCommitInLocalStorage: SinonStub;
    let getBlobWithRetires: SinonStub;
    let createNotification: SinonStub;
    let createNotificationError: SinonStub;

    beforeEach(() => {
        dispatch = sandbox.stub();
        startStaticAccepter = sandbox.stub();
        storeCommitInLocalStorage = sandbox.stub();
        getBlobWithRetires = sandbox.stub().resolves(new Blob(['png']));
        createNotification = sandbox.stub().callsFake((id, status, message, props) => ({
            type: 'notification',
            payload: {id, status, message, props}
        }));
        createNotificationError = sandbox.stub().callsFake((id, error, props) => ({
            type: 'notification-error',
            payload: {id, error, props}
        }));

        actions = proxyquire('lib/static/modules/actions/static-accepter', {
            '@/static/modules/static-accepter-v2': {startStaticAccepter},
            '../static-image-accepter': {storeCommitInLocalStorage},
            '../utils': {getBlobWithRetires},
            '@/static/modules/actions/notifications': {createNotification, createNotificationError}
        });
    });

    afterEach(() => sandbox.restore());

    describe('formatStaticAccepterProgress', () => {
        const cases: Array<[StaticAccepterProgress, string]> = [
            [{phase: 'downloading', completed: 2, total: 5}, 'Downloading screenshots: 2 of 5'],
            [{phase: 'committing', completed: 1.1324234512, total: 17}, 'Creating commits: 1.13 of 17'],
            [{phase: 'waiting-for-confirmation', completed: 3, total: 3}, 'Waiting for static accepter confirmation: 3 of 3'],
            [{phase: 'submitting', completed: 0, total: 1}, 'Adding changes to PR: 0 of 1'],
            [{phase: 'suggesting', completed: 0, total: 1}, 'Suggesting changes in Arcanum: 0 of 1']
        ];

        for (const [progress, expected] of cases) {
            it(`should format the "${progress.phase}" phase`, () => {
                assert.equal(actions.formatStaticAccepterProgress(progress), expected);
            });
        }
    });

    it('should start v2 synchronously with staged images and required options', async () => {
        let resolveOperation: (result: StaticAccepterResult) => void = () => undefined;
        const operation = new Promise<StaticAccepterResult>((resolve) => {
            resolveOperation = resolve;
        });
        startStaticAccepter.callsFake((
            _moduleUrl: string,
            _images: typeof IMAGES,
            options: StaticAccepterOptions
        ): Promise<StaticAccepterResult> => {
            options.onProgressChange?.({phase: 'downloading', completed: 1, total: 2});

            return operation;
        });

        const resultPromise = actions.staticAccepterCommitScreenshot(IMAGES, BASE_OPTIONS)(dispatch, sandbox.stub());

        assert.calledOnce(startStaticAccepter);
        assert.calledWithExactly(
            startStaticAccepter,
            MODULE_URL,
            IMAGES,
            sinon.match({
                message: BASE_OPTIONS.message,
                theme: 'light',
                config: {
                    repositoryUrl: BASE_OPTIONS.repositoryUrl,
                    pullRequestUrl: BASE_OPTIONS.pullRequestUrl
                }
            })
        );
        assert.calledWith(dispatch, {
            type: actionNames.UPDATE_LOADING_TITLE,
            payload: 'Downloading screenshots: 1 of 2'
        });

        const progress = startStaticAccepter.firstCall.args[2].onProgressChange as (value: StaticAccepterProgress) => void;
        progress({phase: 'committing', completed: 1.5, total: 3});
        assert.calledWith(dispatch, {
            type: actionNames.UPDATE_LOADING_TITLE,
            payload: 'Creating commits: 1.5 of 3'
        });
        assert.calledWith(dispatch, {
            type: actionNames.UPDATE_LOADING_PROGRESS,
            payload: {'static-accepter-commit': 0.5}
        });

        resolveOperation({status: 'cancelled'});
        await resultPromise;
    });

    for (const status of ['submitted', 'suggested'] as const) {
        it(`should mark staged images as committed for a ${status} result`, async () => {
            startStaticAccepter.resolves({status});

            const result = await actions.staticAccepterCommitScreenshot(IMAGES, BASE_OPTIONS)(dispatch, sandbox.stub());

            assert.deepEqual(result, {status});
            assert.calledWith(dispatch, {
                type: actionNames.STATIC_ACCEPTER_COMMIT_SCREENSHOT,
                payload: ['image-1']
            });
            assert.calledOnce(storeCommitInLocalStorage);
            assert.calledWithExactly(storeCommitInLocalStorage, [{
                imageId: 'image-1',
                stateNameImageId: 'browser state'
            }]);
            assert.calledOnce(createNotification);
        });
    }

    it('should preserve staged images when v2 is cancelled', async () => {
        startStaticAccepter.resolves({status: 'cancelled'});

        const result = await actions.staticAccepterCommitScreenshot(IMAGES, BASE_OPTIONS)(dispatch, sandbox.stub());

        assert.deepEqual(result, {status: 'cancelled'});
        assert.neverCalledWith(dispatch, sinon.match({type: actionNames.STATIC_ACCEPTER_COMMIT_SCREENSHOT}));
        assert.notCalled(storeCommitInLocalStorage);
    });

    it('should preserve staged images and render errors as text when v2 rejects', async () => {
        const error = new Error('<img src=x onerror=alert(1)>');
        sandbox.stub(console, 'error');
        startStaticAccepter.rejects(error);

        const result = await actions.staticAccepterCommitScreenshot(IMAGES, BASE_OPTIONS)(dispatch, sandbox.stub());

        assert.strictEqual(result.error, error);
        assert.neverCalledWith(dispatch, sinon.match({type: actionNames.STATIC_ACCEPTER_COMMIT_SCREENSHOT}));
        assert.notCalled(storeCommitInLocalStorage);
        assert.calledOnce(createNotificationError);
        assert.calledWithExactly(
            createNotificationError,
            'commitScreenshot',
            error,
            {dismissAfter: 0, allowHTML: false}
        );
    });

    it('should not end the active operation when a concurrent v2 start is rejected', async () => {
        let resolveOperation: (result: StaticAccepterResult) => void = () => undefined;
        const operation = new Promise<StaticAccepterResult>((resolve) => {
            resolveOperation = resolve;
        });
        const concurrentError = new Error('Static Accepter operation is already in progress');
        sandbox.stub(console, 'error');
        startStaticAccepter.onFirstCall().returns(operation);
        startStaticAccepter.onSecondCall().throws(concurrentError);

        const activeResult = actions.staticAccepterCommitScreenshot(IMAGES, BASE_OPTIONS)(dispatch, sandbox.stub());
        const concurrentResult = await actions.staticAccepterCommitScreenshot(IMAGES, BASE_OPTIONS)(dispatch, sandbox.stub());

        assert.strictEqual(concurrentResult.error, concurrentError);
        assert.neverCalledWith(dispatch, sinon.match({type: actionNames.PROCESS_END}));

        resolveOperation({status: 'cancelled'});
        await activeResult;

        const processEndCalls = dispatch.getCalls().filter(call => call.args[0]?.type === actionNames.PROCESS_END);
        assert.lengthOf(processEndCalls, 1);
    });

    it('should preserve the legacy HTTP flow when moduleUrl is absent', async () => {
        const post = sandbox.stub(axios, 'post').resolves({status: 204});

        const result = await actions.staticAccepterCommitScreenshot(IMAGES, {
            ...BASE_OPTIONS,
            moduleUrl: ''
        })(dispatch, sandbox.stub());

        assert.deepEqual(result, {});
        assert.notCalled(startStaticAccepter);
        assert.calledOnce(post);
        assert.calledWith(dispatch, {
            type: actionNames.STATIC_ACCEPTER_COMMIT_SCREENSHOT,
            payload: ['image-1']
        });
        assert.calledOnce(storeCommitInLocalStorage);
    });
});
