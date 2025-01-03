import userEvent from '@testing-library/user-event';
import {expect} from 'chai';
import {http, HttpResponse} from 'msw';
import {setupServer} from 'msw/node';
import React from 'react';
import proxyquire from 'proxyquire';
import {EXPAND_ALL} from 'lib/constants/expand-modes';
import {
    addBrowserToTree,
    addImageToTree,
    addResultToTree,
    addSuiteToTree, mkBrowserEntity,
    mkEmptyTree, mkImageEntityFail, mkRealStore, mkResultEntity, mkSuiteEntityLeaf, renderWithStore
} from '../../../utils';

const handlers = [
    http.post('/reference-data-to-update', () => {
        return HttpResponse.json({});
    }),
    http.post('/update-reference', () => {
        return HttpResponse.json([{
            images: [{id: 'test-1 bro-1 0 state-1', stateName: 'state-1'}]
        }]);
    }),
    http.post('/undo-accept-images', () => {
        return HttpResponse.json({});
    })
];

const server = setupServer(...handlers);

describe('<ScreenshotAccepter/>', () => {
    const sandbox = sinon.sandbox.create();
    let ScreenshotAccepter;
    let preloadImageStub;

    before(() => server.listen());

    after(() => server.close());

    beforeEach(() => {
        global.Element.prototype.scrollTo = () => {};

        preloadImageStub = sandbox.stub();

        ScreenshotAccepter = proxyquire('lib/static/components/modals/screenshot-accepter', {
            '../../../modules/utils': {preloadImage: preloadImageStub}
        }).default;
    });

    afterEach(() => {
        sandbox.restore();
        server.resetHandlers();
    });

    it('should render header with correct images counter', () => {
        const tree = mkEmptyTree();
        const suite = mkSuiteEntityLeaf('test-1');
        addSuiteToTree({tree, suite});
        const browser = mkBrowserEntity('bro-1', {parentId: suite.id});
        addBrowserToTree({tree, browser});
        const result = mkResultEntity('res-1', {parentId: browser.id});
        addResultToTree({tree, result});
        const image1 = mkImageEntityFail('state-1', {parentId: result.id});
        addImageToTree({tree, image: image1});
        const image2 = mkImageEntityFail('state-2', {parentId: result.id});
        addImageToTree({tree, image: image2});
        const store = mkRealStore({initialState: {tree}});
        const currentImageId = image1.id;

        const component = renderWithStore(<ScreenshotAccepter image={tree.images.byId[currentImageId]}/>, store);

        expect(component.getByTestId('screenshot-accepter-progress-bar').dataset.content).to.equal('0/2');
    });

    it('should change attempt by clicking on retry-switcher', async () => {
        const user = userEvent.setup();
        const tree = mkEmptyTree();
        const suite = mkSuiteEntityLeaf('test-1');
        addSuiteToTree({tree, suite});
        const browser = mkBrowserEntity('bro-1', {parentId: suite.id});
        addBrowserToTree({tree, browser});
        const result1 = mkResultEntity('res-1', {parentId: browser.id});
        addResultToTree({tree, result: result1});
        const image1 = mkImageEntityFail('img-1', {stateName: 'plain', parentId: result1.id});
        addImageToTree({tree, image: image1});

        const result2 = mkResultEntity('res-2', {parentId: browser.id, attempt: 1});
        addResultToTree({tree, result: result2});
        const image2 = mkImageEntityFail('img-2', {stateName: 'plain', parentId: result2.id});
        addImageToTree({tree, image: image2});
        const store = mkRealStore({initialState: {tree}});
        const currentImageId = image2.id;

        const component = renderWithStore(<ScreenshotAccepter image={tree.images.byId[currentImageId]}/>, store);
        // By default, last failed attempt is selected. We select first one.
        await user.click(component.getByText('1', {selector: 'button[data-qa="retry-switcher"] > *'}));

        const imageElements = component.getAllByRole('img');
        imageElements.every(imageElement => expect(imageElement.src).to.include('img-1'));
    });

    it('should change image by clicking on "next" button', async () => {
        const user = userEvent.setup();
        const tree = mkEmptyTree();
        const suite = mkSuiteEntityLeaf('test-1');
        addSuiteToTree({tree, suite});
        const browser = mkBrowserEntity('bro-1', {parentId: suite.id});
        addBrowserToTree({tree, browser});
        const result = mkResultEntity('res-1', {parentId: browser.id});
        addResultToTree({tree, result});
        const image1 = mkImageEntityFail('state-1', {parentId: result.id});
        addImageToTree({tree, image: image1});
        const image2 = mkImageEntityFail('state-2', {parentId: result.id});
        addImageToTree({tree, image: image2});
        const store = mkRealStore({initialState: {tree}});
        const currentImageId = image1.id;

        const component = renderWithStore(<ScreenshotAccepter image={tree.images.byId[currentImageId]}/>, store);
        await user.click(component.getByTitle('Show next image', {exact: false}));

        const imageElements = component.getAllByRole('img');
        imageElements.every(imageElement => expect(imageElement.src).to.include('state-2'));
    });

    it('should show a success message after accepting last screenshot', async () => {
        const user = userEvent.setup();
        const tree = mkEmptyTree();
        const suite = mkSuiteEntityLeaf('test-1');
        addSuiteToTree({tree, suite});
        const browser = mkBrowserEntity('bro-1', {parentId: suite.id});
        addBrowserToTree({tree, browser});
        const result = mkResultEntity('res-1', {parentId: browser.id});
        addResultToTree({tree, result});
        const image1 = mkImageEntityFail('state-1', {parentId: result.id});
        addImageToTree({tree, image: image1});
        const store = mkRealStore({initialState: {tree}});
        const currentImageId = image1.id;

        const component = renderWithStore(<ScreenshotAccepter image={tree.images.byId[currentImageId]}/>, store);
        await user.click(component.getByText('Accept', {selector: 'button > *'}));

        await component.findByText('All screenshots are accepted', {exact: false, timeout: 1500});
    });

    it('should should display meta info', async () => {
        const user = userEvent.setup();
        const tree = mkEmptyTree();
        const suite = mkSuiteEntityLeaf('test-1');
        addSuiteToTree({tree, suite});
        const browser = mkBrowserEntity('bro-1', {parentId: suite.id});
        addBrowserToTree({tree, browser});
        const result = mkResultEntity('res-1', {parentId: browser.id, metaInfo: {
            key1: 'some-value-1',
            key2: 'some-value-2'
        }});
        addResultToTree({tree, result});
        const image1 = mkImageEntityFail('state-1', {parentId: result.id});
        addImageToTree({tree, image: image1});
        const store = mkRealStore({initialState: {tree}});
        const currentImageId = image1.id;

        const component = renderWithStore(<ScreenshotAccepter image={tree.images.byId[currentImageId]}/>, store);
        await user.click(component.getByText('Show meta', {selector: 'button > *'}));

        expect(component.getByText('some-value-1')).to.exist;
        expect(component.getByText('some-value-2')).to.exist;
    });

    it('should return to original state after clicking "undo"', async () => {
        const user = userEvent.setup();
        const tree = mkEmptyTree();
        const suite = mkSuiteEntityLeaf('test-1');
        addSuiteToTree({tree, suite});
        const browser = mkBrowserEntity('bro-1', {parentId: suite.id});
        addBrowserToTree({tree, browser});
        const result = mkResultEntity('res-1', {parentId: browser.id});
        addResultToTree({tree, result});
        const image1 = mkImageEntityFail('state-1', {parentId: result.id});
        addImageToTree({tree, image: image1});
        const store = mkRealStore({initialState: {tree}});
        const currentImageId = image1.id;

        const component = renderWithStore(<ScreenshotAccepter image={tree.images.byId[currentImageId]}/>, store);
        await user.click(component.getByText('Accept', {selector: 'button > *'}));
        await user.click(component.getByText('Undo', {selector: 'button > *'}));

        expect(component.getByTestId('screenshot-accepter-progress-bar').dataset.content).to.equal('0/1');
        const imageElements = component.getAllByRole('img');
        imageElements.every(imageElement => expect(imageElement.src).to.include('state-1'));
    });

    describe('exiting from screenshot accepter', () => {
        const mkDispatchInterceptorMiddleware = (interceptor) => {
            return () => {
                return function wrapDispatch(next) {
                    return function handler(action) {
                        interceptor(action);
                        next(action);
                    };
                };
            };
        };

        it('should not apply delayed test result, if no screens were accepted', async () => {
            const reduxAction = sinon.stub();
            const user = userEvent.setup();
            const tree = mkEmptyTree();
            const suite = mkSuiteEntityLeaf('test-1');
            addSuiteToTree({tree, suite});
            const browser = mkBrowserEntity('bro-1', {parentId: suite.id});
            addBrowserToTree({tree, browser});
            const result = mkResultEntity('res-1', {parentId: browser.id});
            addResultToTree({tree, result});
            const image1 = mkImageEntityFail('state-1', {parentId: result.id});
            addImageToTree({tree, image: image1});

            const middleware = mkDispatchInterceptorMiddleware(reduxAction);
            const store = mkRealStore({initialState: {tree, view: {expand: EXPAND_ALL}}, middlewares: [middleware]});
            const currentImageId = image1.id;

            const component = renderWithStore(<ScreenshotAccepter image={tree.images.byId[currentImageId]}/>, store);

            await user.click(component.getByTitle('Close mode with fast screenshot accepting', {exact: false}));

            assert.neverCalledWith(reduxAction, sinon.match({type: 'APPLY_DELAYED_TEST_RESULTS'}));
        });

        it('should apply delayed test result, if some screens were accepted', async () => {
            const reduxAction = sinon.stub();
            const user = userEvent.setup();
            const tree = mkEmptyTree();
            const suite = mkSuiteEntityLeaf('test-1');
            addSuiteToTree({tree, suite});
            const browser = mkBrowserEntity('bro-1', {parentId: suite.id});
            addBrowserToTree({tree, browser});
            const result = mkResultEntity('res-1', {parentId: browser.id});
            addResultToTree({tree, result});
            const image1 = mkImageEntityFail('state-1', {parentId: result.id});
            addImageToTree({tree, image: image1});

            const middleware = mkDispatchInterceptorMiddleware(reduxAction);
            const store = mkRealStore({initialState: {tree, view: {expand: EXPAND_ALL}}, middlewares: [middleware]});
            const currentImageId = image1.id;

            const component = renderWithStore(<ScreenshotAccepter image={tree.images.byId[currentImageId]}/>, store);

            await user.click(component.getByText('Accept', {selector: 'button > *'}));
            await user.click(component.getByTitle('Close mode with fast screenshot accepting', {exact: false}));

            assert.calledWith(reduxAction, sinon.match({type: 'COMMIT_ACCEPTED_IMAGES_TO_TREE'}));
        });

        it('should not apply delayed test result, if it is cancelled by "Undo"', async () => {
            const reduxAction = sinon.stub();
            const user = userEvent.setup();
            const tree = mkEmptyTree();
            const suite = mkSuiteEntityLeaf('test-1');
            addSuiteToTree({tree, suite});
            const browser = mkBrowserEntity('bro-1', {parentId: suite.id});
            addBrowserToTree({tree, browser});
            const result = mkResultEntity('res-1', {parentId: browser.id});
            addResultToTree({tree, result});
            const image1 = mkImageEntityFail('state-1', {parentId: result.id});
            addImageToTree({tree, image: image1});

            const middleware = mkDispatchInterceptorMiddleware(reduxAction);
            const store = mkRealStore({initialState: {tree, view: {expand: EXPAND_ALL}}, middlewares: [middleware]});
            const currentImageId = image1.id;

            const component = renderWithStore(<ScreenshotAccepter image={tree.images.byId[currentImageId]}/>, store);

            await user.click(component.getByText('Accept', {selector: 'button > *'}));
            await user.click(component.getByText('Undo', {selector: 'button > *'}));
            await user.click(component.getByTitle('Close mode with fast screenshot accepting', {exact: false}));

            assert.neverCalledWith(reduxAction, sinon.match({type: 'APPLY_DELAYED_TEST_RESULTS'}));
        });
    });

    describe('images preloading', () => {
        let component;

        const eachLabel_ = (cb) => ['expected', 'actual', 'diff'].forEach(cb);

        beforeEach(() => {
            const tree = mkEmptyTree();
            const suite = mkSuiteEntityLeaf('test-1');
            addSuiteToTree({tree, suite});
            const browser = mkBrowserEntity('bro-1', {parentId: suite.id});
            addBrowserToTree({tree, browser});
            const result = mkResultEntity('res-1', {parentId: browser.id});
            addResultToTree({tree, result});

            for (let i = 1; i <= 10; i++) {
                const image = mkImageEntityFail(`state-${i}`, {parentId: result.id});
                addImageToTree({tree, image});
            }
            const store = mkRealStore({initialState: {tree, view: {expand: EXPAND_ALL}}});

            const currentImageId = Object.values(tree.images.byId)[4].id;

            component = renderWithStore(<ScreenshotAccepter image={tree.images.byId[currentImageId]}/>, store);
        });

        it('should preload 3 adjacent images on mount', () => {
            // Current image is 5.
            [2, 3, 4, 6, 7, 8].forEach(ind => {
                eachLabel_(label => {
                    assert.calledWith(preloadImageStub, `state-${ind}-${label}`);
                });
            });
        });

        it('should not preload other images', () => {
            [1, 9, 10].forEach(ind => {
                eachLabel_(label => {
                    assert.neverCalledWith(preloadImageStub, `state-${ind}-${label}`);
                });
            });
        });

        it('should preload one more image when switching to next image', async () => {
            const user = userEvent.setup();
            await user.click(component.getByTitle('Show next image', {exact: false}));

            eachLabel_(label => {
                assert.calledWith(preloadImageStub, `state-9-${label}`);
            });
        });

        it('should preload one more image after accepting', async () => {
            const user = userEvent.setup();
            await user.click(component.getByText('Accept', {selector: 'button > *'}));

            eachLabel_(label => {
                assert.calledWith(preloadImageStub, `state-9-${label}`);
            });
        });
    });
});
