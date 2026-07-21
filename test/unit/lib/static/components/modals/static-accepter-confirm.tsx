import {act, RenderResult, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import proxyquire from 'proxyquire';
import React from 'react';
import sinon, {SinonStub} from 'sinon';

import {TestStatus} from '@/constants';
import type {StaticAccepterModule} from '@/static/modules/static-accepter-v2';
import {mkImageEntityFail, mkRealStore, renderWithStore} from '../../utils';

const MODULE_URL = 'https://static-accepter.my-company.com/v2/script.js';

describe('<StaticAccepterConfirm />', () => {
    const sandbox = sinon.createSandbox();
    let preloadStaticAccepter: SinonStub;

    const renderConfirm = (commitError?: Error): RenderResult => {
        const image = mkImageEntityFail('image-1', {
            actualImg: {path: '/actual.png', size: {width: 10, height: 10}},
            refImg: {path: '/expected.png', relativePath: 'screens/expected.png', size: {width: 10, height: 10}}
        });
        const actionsStub = commitError
            ? {staticAccepterCommitScreenshot: sandbox.stub().returns(() => Promise.resolve({error: commitError}))}
            : {};
        const StaticAccepterConfirm = proxyquire('lib/static/components/modals/static-accepter-confirm', {
            '../../../modules/static-accepter-v2': {preloadStaticAccepter},
            '../../../modules/actions': actionsStub
        }).default;

        const store = mkRealStore({initialState: {
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
            tree: {
                images: {
                    byId: {[image.id]: image}
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
            }
        } as any, middlewares: []});

        return renderWithStore(<StaticAccepterConfirm />, store);
    };

    beforeEach(() => {
        preloadStaticAccepter = sandbox.stub();
    });

    afterEach(() => sandbox.restore());

    it('should disable Commit until the v2 module is preloaded', async () => {
        let resolvePreload: (module: StaticAccepterModule) => void = () => undefined;
        const preload = new Promise<StaticAccepterModule>((resolve) => {
            resolvePreload = resolve;
        });
        preloadStaticAccepter.returns(preload);
        const component = renderConfirm();
        const commitButton = component.getByRole('button', {name: 'Commit'});

        assert.isTrue((commitButton as HTMLButtonElement).disabled);
        assert.calledOnce(preloadStaticAccepter);
        assert.calledWithExactly(preloadStaticAccepter, MODULE_URL);

        await act(async () => {
            resolvePreload({default: sandbox.stub()});
            await preload;
        });

        await waitFor(() => assert.isFalse((commitButton as HTMLButtonElement).disabled));
    });

    it('should keep the confirmation open without popup guidance for other errors', async () => {
        const user = userEvent.setup();
        sandbox.stub(console, 'error');
        preloadStaticAccepter.resolves({default: sandbox.stub()});
        const component = renderConfirm();
        const commitButton = component.getByRole('button', {name: 'Commit'});

        await waitFor(() => assert.isFalse((commitButton as HTMLButtonElement).disabled));
        await user.click(commitButton);

        const alert = await component.findByRole('alert');
        assert.include(alert.textContent, 'not loaded yet');
        assert.notInclude(alert.textContent, 'Allow popups');
        await waitFor(() => assert.isFalse((commitButton as HTMLButtonElement).disabled));
        assert.exists(component.getByText(/You are commiting/));
    });

    it('should show popup retry guidance when the popup is blocked', async () => {
        const user = userEvent.setup();
        const errorMessage = 'static accepter confirmation popup was blocked by the browser';
        preloadStaticAccepter.resolves({default: sandbox.stub()});
        const component = renderConfirm(new Error(errorMessage));
        const commitButton = component.getByRole('button', {name: 'Commit'});

        await waitFor(() => assert.isFalse((commitButton as HTMLButtonElement).disabled));
        await user.click(commitButton);

        const alert = await component.findByRole('alert');
        assert.include(alert.textContent, errorMessage);
        assert.include(alert.textContent, 'Allow popups');
        assert.exists(component.getByText(/You are commiting/));
    });
});
