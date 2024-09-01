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
    addSuiteToTree, generateImageId,
    mkEmptyTree, mkRealStore, renderWithStore
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
        addSuiteToTree({tree, suiteName: 'test-1'});
        addBrowserToTree({tree, suiteName: 'test-1', browserName: 'bro-1'});
        addResultToTree({tree, suiteName: 'test-1', browserName: 'bro-1', attempt: 0});
        addImageToTree({
            tree,
            suiteName: 'test-1',
            browserName: 'bro-1',
            attempt: 0,
            stateName: 'state-1',
            expectedImgPath: 'img1-expected.png',
            actualImgPath: 'img1-actual.png',
            diffImgPath: 'img1-diff.png'
        });
        addImageToTree({
            tree,
            suiteName: 'test-1',
            browserName: 'bro-1',
            attempt: 0,
            stateName: 'state-2',
            expectedImgPath: 'img2-expected.png',
            actualImgPath: 'img2-actual.png',
            diffImgPath: 'img2-diff.png'
        });
        const store = mkRealStore({initialState: {tree}});
        const currentImageId = generateImageId({suiteName: 'test-1', browserName: 'bro-1', attempt: 0, stateName: 'state-1'});

        const component = renderWithStore(<ScreenshotAccepter image={tree.images.byId[currentImageId]}/>, store);

        expect(component.getByTestId('screenshot-accepter-progress-bar').dataset.content).to.equal('0/2');
    });

    it('should change attempt by clicking on retry-switcher', async () => {
        const user = userEvent.setup();
        const tree = mkEmptyTree();
        addSuiteToTree({tree, suiteName: 'test-1'});
        addBrowserToTree({tree, suiteName: 'test-1', browserName: 'bro-1'});
        addResultToTree({tree, suiteName: 'test-1', browserName: 'bro-1', attempt: 0});
        addResultToTree({tree, suiteName: 'test-1', browserName: 'bro-1', attempt: 1});
        addImageToTree({
            tree,
            suiteName: 'test-1',
            browserName: 'bro-1',
            attempt: 0,
            stateName: 'state-1',
            expectedImgPath: 'img1-expected.png',
            actualImgPath: 'img1-actual.png',
            diffImgPath: 'img1-diff.png'
        });
        addImageToTree({
            tree,
            suiteName: 'test-1',
            browserName: 'bro-1',
            attempt: 1,
            stateName: 'state-1',
            expectedImgPath: 'img2-expected.png',
            actualImgPath: 'img2-actual.png',
            diffImgPath: 'img2-diff.png'
        });
        const store = mkRealStore({initialState: {tree}});
        const currentImageId = generateImageId({suiteName: 'test-1', browserName: 'bro-1', attempt: 1, stateName: 'state-1'});

        const component = renderWithStore(<ScreenshotAccepter image={tree.images.byId[currentImageId]}/>, store);
        // By default, last failed attempt is selected. We select first one.
        await user.click(component.getByText('1', {selector: 'button[data-qa="retry-switcher"] > *'}));

        const imageElements = component.getAllByRole('img');
        imageElements.every(imageElement => expect(imageElement.src).to.include('img1'));
    });

    it('should change image by clicking on "next" button', async () => {
        const user = userEvent.setup();
        const tree = mkEmptyTree();
        addSuiteToTree({tree, suiteName: 'test-1'});
        addBrowserToTree({tree, suiteName: 'test-1', browserName: 'bro-1'});
        addResultToTree({tree, suiteName: 'test-1', browserName: 'bro-1', attempt: 0});
        addImageToTree({
            tree,
            suiteName: 'test-1',
            browserName: 'bro-1',
            attempt: 0,
            stateName: 'state-1',
            expectedImgPath: 'img1-expected.png',
            actualImgPath: 'img1-actual.png',
            diffImgPath: 'img1-diff.png'
        });
        addImageToTree({
            tree,
            suiteName: 'test-1',
            browserName: 'bro-1',
            attempt: 0,
            stateName: 'state-2',
            expectedImgPath: 'img2-expected.png',
            actualImgPath: 'img2-actual.png',
            diffImgPath: 'img2-diff.png'
        });
        const store = mkRealStore({initialState: {tree}});
        const currentImageId = generateImageId({suiteName: 'test-1', browserName: 'bro-1', attempt: 0, stateName: 'state-1'});

        const component = renderWithStore(<ScreenshotAccepter image={tree.images.byId[currentImageId]}/>, store);
        await user.click(component.getByTitle('Show next image', {exact: false}));

        const imageElements = component.getAllByRole('img');
        imageElements.every(imageElement => expect(imageElement.src).to.include('img2'));
    });

    it('should show a success message after accepting last screenshot', async () => {
        const user = userEvent.setup();
        const tree = mkEmptyTree();
        addSuiteToTree({tree, suiteName: 'test-1'});
        addBrowserToTree({tree, suiteName: 'test-1', browserName: 'bro-1'});
        addResultToTree({tree, suiteName: 'test-1', browserName: 'bro-1', attempt: 0});
        addImageToTree({
            tree,
            suiteName: 'test-1',
            browserName: 'bro-1',
            attempt: 0,
            stateName: 'state-1',
            expectedImgPath: 'img1-expected.png',
            actualImgPath: 'img1-actual.png',
            diffImgPath: 'img1-diff.png'
        });
        const store = mkRealStore({initialState: {tree}});
        const currentImageId = generateImageId({suiteName: 'test-1', browserName: 'bro-1', attempt: 0, stateName: 'state-1'});

        const component = renderWithStore(<ScreenshotAccepter image={tree.images.byId[currentImageId]}/>, store);
        await user.click(component.getByText('Accept', {selector: 'button > *'}));

        await component.findByText('All screenshots are accepted', {exact: false, timeout: 1500});
    });

    it('should should display meta info', async () => {
        const user = userEvent.setup();
        const tree = mkEmptyTree();
        addSuiteToTree({tree, suiteName: 'test-1'});
        addBrowserToTree({tree, suiteName: 'test-1', browserName: 'bro-1'});
        addResultToTree({tree, suiteName: 'test-1', browserName: 'bro-1', attempt: 0, metaInfo: {
            key1: 'some-value-1',
            key2: 'some-value-2'
        }});
        addImageToTree({
            tree,
            suiteName: 'test-1',
            browserName: 'bro-1',
            attempt: 0,
            stateName: 'state-1',
            expectedImgPath: 'img1-expected.png',
            actualImgPath: 'img1-actual.png',
            diffImgPath: 'img1-diff.png'
        });
        const store = mkRealStore({initialState: {tree}});
        const currentImageId = generateImageId({suiteName: 'test-1', browserName: 'bro-1', attempt: 0, stateName: 'state-1'});

        const component = renderWithStore(<ScreenshotAccepter image={tree.images.byId[currentImageId]}/>, store);
        await user.click(component.getByText('Show meta', {selector: 'button > *'}));

        expect(component.getByText('some-value-1')).to.exist;
        expect(component.getByText('some-value-2')).to.exist;
    });

    it('should return to original state after clicking "undo"', async () => {
        const user = userEvent.setup();
        const tree = mkEmptyTree();
        addSuiteToTree({tree, suiteName: 'test-1'});
        addBrowserToTree({tree, suiteName: 'test-1', browserName: 'bro-1'});
        addResultToTree({tree, suiteName: 'test-1', browserName: 'bro-1', attempt: 0});
        addImageToTree({
            tree,
            suiteName: 'test-1',
            browserName: 'bro-1',
            attempt: 0,
            stateName: 'state-1',
            expectedImgPath: 'img1-expected.png',
            actualImgPath: 'img1-actual.png',
            diffImgPath: 'img1-diff.png'
        });
        const store = mkRealStore({initialState: {tree}});
        const currentImageId = generateImageId({suiteName: 'test-1', browserName: 'bro-1', attempt: 0, stateName: 'state-1'});

        const component = renderWithStore(<ScreenshotAccepter image={tree.images.byId[currentImageId]}/>, store);
        await user.click(component.getByText('Accept', {selector: 'button > *'}));
        await user.click(component.getByText('Undo', {selector: 'button > *'}));

        expect(component.getByTestId('screenshot-accepter-progress-bar').dataset.content).to.equal('0/1');
        const imageElements = component.getAllByRole('img');
        imageElements.every(imageElement => expect(imageElement.src).to.include('img1'));
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
            addSuiteToTree({tree, suiteName: 'test-1'});
            addBrowserToTree({tree, suiteName: 'test-1', browserName: 'bro-1'});
            addResultToTree({tree, suiteName: 'test-1', browserName: 'bro-1', attempt: 0});
            addImageToTree({
                tree,
                suiteName: 'test-1',
                browserName: 'bro-1',
                attempt: 0,
                stateName: 'state-1',
                expectedImgPath: 'img1-expected.png',
                diffImgPath: 'img1-diff.png',
                actualImgPath: 'img1-actual.png'
            });

            const middleware = mkDispatchInterceptorMiddleware(reduxAction);
            const store = mkRealStore({initialState: {tree, view: {expand: EXPAND_ALL}}, middlewares: [middleware]});
            const currentImageId = generateImageId({suiteName: 'test-1', browserName: 'bro-1', attempt: 0, stateName: 'state-1'});

            const component = renderWithStore(<ScreenshotAccepter image={tree.images.byId[currentImageId]}/>, store);

            await user.click(component.getByTitle('Close mode with fast screenshot accepting', {exact: false}));

            assert.neverCalledWith(reduxAction, sinon.match({type: 'APPLY_DELAYED_TEST_RESULTS'}));
        });

        it('should apply delayed test result, if some screens were accepted', async () => {
            const reduxAction = sinon.stub();
            const user = userEvent.setup();
            const tree = mkEmptyTree();
            addSuiteToTree({tree, suiteName: 'test-1'});
            addBrowserToTree({tree, suiteName: 'test-1', browserName: 'bro-1'});
            addResultToTree({tree, suiteName: 'test-1', browserName: 'bro-1', attempt: 0});
            addImageToTree({
                tree,
                suiteName: 'test-1',
                browserName: 'bro-1',
                attempt: 0,
                stateName: 'state-1',
                expectedImgPath: 'img1-expected.png',
                diffImgPath: 'img1-diff.png',
                actualImgPath: 'img1-actual.png'
            });

            const middleware = mkDispatchInterceptorMiddleware(reduxAction);
            const store = mkRealStore({initialState: {tree, view: {expand: EXPAND_ALL}}, middlewares: [middleware]});
            const currentImageId = generateImageId({suiteName: 'test-1', browserName: 'bro-1', attempt: 0, stateName: 'state-1'});

            const component = renderWithStore(<ScreenshotAccepter image={tree.images.byId[currentImageId]}/>, store);

            await user.click(component.getByText('Accept', {selector: 'button > *'}));
            await user.click(component.getByTitle('Close mode with fast screenshot accepting', {exact: false}));

            assert.calledWith(reduxAction, sinon.match({type: 'APPLY_DELAYED_TEST_RESULTS'}));
        });

        it('should not apply delayed test result, if it is cancelled by "Undo"', async () => {
            const reduxAction = sinon.stub();
            const user = userEvent.setup();
            const tree = mkEmptyTree();
            addSuiteToTree({tree, suiteName: 'test-1'});
            addBrowserToTree({tree, suiteName: 'test-1', browserName: 'bro-1'});
            addResultToTree({tree, suiteName: 'test-1', browserName: 'bro-1', attempt: 0});
            addImageToTree({
                tree,
                suiteName: 'test-1',
                browserName: 'bro-1',
                attempt: 0,
                stateName: 'state-1',
                expectedImgPath: 'img1-expected.png',
                diffImgPath: 'img1-diff.png',
                actualImgPath: 'img1-actual.png'
            });

            const middleware = mkDispatchInterceptorMiddleware(reduxAction);
            const store = mkRealStore({initialState: {tree, view: {expand: EXPAND_ALL}}, middlewares: [middleware]});
            const currentImageId = generateImageId({suiteName: 'test-1', browserName: 'bro-1', attempt: 0, stateName: 'state-1'});

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
            addSuiteToTree({tree, suiteName: 'test-1'});
            addBrowserToTree({tree, suiteName: 'test-1', browserName: 'bro-1'});
            addResultToTree({tree, suiteName: 'test-1', browserName: 'bro-1', attempt: 0});
            for (let i = 1; i <= 10; i++) {
                addImageToTree({
                    tree,
                    suiteName: 'test-1',
                    browserName: 'bro-1',
                    attempt: 0,
                    stateName: `state-${i}`,
                    expectedImgPath: `img${i}-expected.png`,
                    diffImgPath: `img${i}-diff.png`,
                    actualImgPath: `img${i}-actual.png`
                });
            }
            const store = mkRealStore({initialState: {tree, view: {expand: EXPAND_ALL}}});

            const currentImageId = generateImageId({
                suiteName: 'test-1',
                browserName: 'bro-1',
                attempt: 0,
                stateName: 'state-5'
            });

            component = renderWithStore(<ScreenshotAccepter image={tree.images.byId[currentImageId]}/>, store);
        });

        it('should preload 3 adjacent images on mount', () => {
            // Current image is 5.
            [2, 3, 4, 6, 7, 8].forEach(ind => {
                eachLabel_(label => {
                    assert.calledWith(preloadImageStub, `img${ind}-${label}.png`);
                });
            });
        });

        it('should not preload other images', () => {
            [1, 9, 10].forEach(ind => {
                eachLabel_(label => {
                    assert.neverCalledWith(preloadImageStub, `img${ind}-${label}.png`);
                });
            });
        });

        it('should preload one more image when switching to next image', async () => {
            const user = userEvent.setup();
            await user.click(component.getByTitle('Show next image', {exact: false}));

            eachLabel_(label => {
                assert.calledWith(preloadImageStub, `img9-${label}.png`);
            });
        });

        it('should preload one more image after accepting', async () => {
            const user = userEvent.setup();
            await user.click(component.getByText('Accept', {selector: 'button > *'}));

            eachLabel_(label => {
                assert.calledWith(preloadImageStub, `img9-${label}.png`);
            });
        });
    });
});
