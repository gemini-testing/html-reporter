import {ThemeProvider, Toaster, ToasterProvider} from '@gravity-ui/uikit';
import {act, render, RenderResult, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import proxyquire from 'proxyquire';
import React from 'react';
import {Provider} from 'react-redux';
import {MemoryRouter} from 'react-router-dom';
import sinon, {SinonStub} from 'sinon';

import {PathNames, TestStatus} from '@/constants';
import type {CommitResult} from '@/static/modules/actions';
import actionNames from '@/static/modules/action-names';
import type {StaticAccepterModule, StaticAccepterResult} from '@/static/modules/static-accepter-v2';
import {
    addBrowserToTree,
    addImageToTree,
    addResultToTree,
    addSuiteToTree,
    mkBrowserEntity,
    mkEmptyTree,
    mkImageEntityFail,
    mkRealStore,
    mkResultEntity,
    mkSuiteEntityLeaf
} from '../../utils';

const MODULE_URL = 'https://static-accepter.my-company.com/v2/script.js';

interface Deferred<T> {
    promise: Promise<T>;
    resolve(value: T): void;
}

function createDeferred<T>(): Deferred<T> {
    let resolvePromise: (value: T) => void = () => undefined;
    const promise = new Promise<T>((resolve) => {
        resolvePromise = resolve;
    });

    return {promise, resolve: resolvePromise};
}

describe('<GuiniToolbarOverlay />', () => {
    const sandbox = sinon.createSandbox();
    let preloadStaticAccepter: SinonStub;
    let staticAccepterCommitScreenshot: SinonStub;

    const renderOverlay = (): {component: RenderResult; store: ReturnType<typeof mkRealStore>} => {
        const tree = mkEmptyTree();
        const suite = mkSuiteEntityLeaf('suite');
        addSuiteToTree({tree, suite});
        const browser = mkBrowserEntity('browser', {parentId: suite.id});
        addBrowserToTree({tree, browser});
        const result = mkResultEntity('result', {parentId: browser.id, status: TestStatus.FAIL});
        addResultToTree({tree, result});
        const image = mkImageEntityFail('image-1', {
            parentId: result.id,
            actualImg: {path: '/actual.png', size: {width: 10, height: 10}},
            refImg: {path: '/expected.png', relativePath: 'screens/expected.png', size: {width: 10, height: 10}}
        });
        addImageToTree({tree, image});

        const store = mkRealStore({
            initialState: {
                tree,
                processing: false,
                config: {
                    staticImageAccepter: {
                        enabled: true,
                        repositoryUrl: 'https://github.com/org/project',
                        pullRequestUrl: 'https://github.com/org/project/pull/42',
                        serviceUrl: '',
                        moduleUrl: MODULE_URL,
                        meta: {},
                        axiosRequestOptions: {}
                    }
                },
                staticImageAccepter: {
                    enabled: true,
                    acceptableImages: {
                        [image.id]: {
                            id: image.id,
                            parentId: image.parentId,
                            stateName: image.stateName,
                            stateNameImageId: 'browser state',
                            commitStatus: TestStatus.STAGED,
                            originalStatus: TestStatus.FAIL
                        }
                    },
                    accepterDelayedImages: [],
                    imagesToCommitCount: 1
                },
                app: {
                    loading: {
                        taskTitle: 'Starting Static Accepter'
                    }
                }
            } as any,
            middlewares: []
        });
        const {GuiniToolbarOverlay} = proxyquire('lib/static/new-ui/components/GuiniToolbarOverlay', {
            '@/static/modules/static-accepter-v2': {preloadStaticAccepter},
            '@/static/modules/actions': {staticAccepterCommitScreenshot}
        });
        const toaster = new Toaster();
        const component = render(
            <ThemeProvider theme='light'>
                <ToasterProvider toaster={toaster}>
                    <Provider store={store}>
                        <MemoryRouter initialEntries={[PathNames.suites]}>
                            <GuiniToolbarOverlay />
                        </MemoryRouter>
                    </Provider>
                </ToasterProvider>
            </ThemeProvider>
        );

        return {component, store};
    };

    beforeEach(() => {
        preloadStaticAccepter = sandbox.stub();
        staticAccepterCommitScreenshot = sandbox.stub();
    });

    afterEach(() => sandbox.restore());

    it('should hide staged-image editing while processing and restore it afterwards', async () => {
        const {component, store} = renderOverlay();
        const toolbar = component.getByText('1 image is staged for commit').parentElement as HTMLElement;

        await waitFor(() => assert.include(toolbar.className, 'visible'));

        act(() => store.dispatch({type: actionNames.PROCESS_BEGIN}));
        await waitFor(() => assert.notInclude(toolbar.className, 'visible'));

        act(() => store.dispatch({type: actionNames.PROCESS_END}));
        await waitFor(() => assert.include(toolbar.className, 'visible'));
    });

    it('should disable final Commit until preload and keep staged images while v2 is pending', async () => {
        const user = userEvent.setup();
        const preload = createDeferred<StaticAccepterModule>();
        const operation = createDeferred<CommitResult>();
        preloadStaticAccepter.returns(preload.promise);
        staticAccepterCommitScreenshot.callsFake(() => (): Promise<CommitResult> => operation.promise);
        const {component, store} = renderOverlay();

        await user.click(component.getByRole('button', {name: 'Commit...'}));
        const dialog = component.getByRole('dialog');
        const commitButton = within(dialog).getByRole('button', {name: 'Commit'});
        const loadingStatus = within(dialog).getByText('Loading Static Accepter…');

        assert.isTrue((commitButton as HTMLButtonElement).disabled);
        assert.strictEqual(loadingStatus.parentElement, commitButton.parentElement);
        assert.calledOnce(preloadStaticAccepter);
        assert.calledWithExactly(preloadStaticAccepter, MODULE_URL);

        await act(async () => {
            preload.resolve({default: sandbox.stub()});
            await preload.promise;
        });
        await waitFor(() => assert.isFalse((commitButton as HTMLButtonElement).disabled));

        await user.click(commitButton);

        assert.calledOnce(staticAccepterCommitScreenshot);
        assert.isTrue((within(dialog).getByRole('button', {name: 'Cancel'}) as HTMLButtonElement).disabled);
        assert.equal(
            store.getState().staticImageAccepter.acceptableImages['image-1'].commitStatus,
            TestStatus.STAGED
        );

        await act(async () => {
            operation.resolve({status: 'cancelled'});
            await operation.promise;
        });
        await waitFor(() => assert.notExists(component.queryByText('Commit images')));
        assert.equal(
            store.getState().staticImageAccepter.acceptableImages['image-1'].commitStatus,
            TestStatus.STAGED
        );
    });

    it('should show preload errors as text and support an explicit retry', async () => {
        const user = userEvent.setup();
        const module: StaticAccepterModule = {
            default: sandbox.stub().resolves({status: 'cancelled'} satisfies StaticAccepterResult)
        };
        preloadStaticAccepter
            .onFirstCall().rejects(new Error('<b>network failed</b>'))
            .onSecondCall().resolves(module);
        const {component} = renderOverlay();

        await user.click(component.getByRole('button', {name: 'Commit...'}));
        const alert = await component.findByRole('alert');

        assert.include(alert.textContent, '<b>network failed</b>');
        assert.notExists(alert.querySelector('b'));
        assert.isTrue((component.getByRole('button', {name: 'Commit'}) as HTMLButtonElement).disabled);

        await user.click(component.getByRole('button', {name: 'Retry loading'}));

        await waitFor(() => assert.isFalse((component.getByRole('button', {name: 'Commit'}) as HTMLButtonElement).disabled));
        assert.calledTwice(preloadStaticAccepter);
    });

    it('should keep the dialog open with popup retry guidance when start fails', async () => {
        const user = userEvent.setup();
        preloadStaticAccepter.resolves({default: sandbox.stub()});
        staticAccepterCommitScreenshot.callsFake(() => (): Promise<CommitResult> => (
            Promise.resolve({error: new Error('static accepter confirmation popup was blocked by the browser')})
        ));
        const {component} = renderOverlay();

        await user.click(component.getByRole('button', {name: 'Commit...'}));
        const commitButton = component.getByRole('button', {name: 'Commit'});
        await waitFor(() => assert.isFalse((commitButton as HTMLButtonElement).disabled));
        await user.click(commitButton);

        const alert = await component.findByRole('alert');
        assert.include(alert.textContent, 'static accepter confirmation popup was blocked by the browser');
        assert.include(alert.textContent, 'Allow popups');
        assert.exists(component.getByText('Commit images'));
        await waitFor(() => assert.isFalse((commitButton as HTMLButtonElement).disabled));
    });

    it('should not show popup retry guidance when the popup opened before an error', async () => {
        const user = userEvent.setup();
        const errorMessage = 'static accepter confirmation popup did not initialize: https://static-accepter.my-company.com/v2/popup.html';
        preloadStaticAccepter.resolves({default: sandbox.stub()});
        staticAccepterCommitScreenshot.callsFake(() => (): Promise<CommitResult> => (
            Promise.resolve({error: new Error(errorMessage)})
        ));
        const {component} = renderOverlay();

        await user.click(component.getByRole('button', {name: 'Commit...'}));
        const commitButton = component.getByRole('button', {name: 'Commit'});
        await waitFor(() => assert.isFalse((commitButton as HTMLButtonElement).disabled));
        await user.click(commitButton);

        const alert = await component.findByRole('alert');
        assert.include(alert.textContent, errorMessage);
        assert.notInclude(alert.textContent, 'Allow popups');
        assert.exists(component.getByText('Commit images'));
    });
});
