import userEvent from '@testing-library/user-event';
import {expect} from 'chai';
import {defaults} from 'lodash';
import React from 'react';
import {DiffModes} from 'lib/constants';
import ScreenshotAccepterHeader from 'lib/static/components/modals/screenshot-accepter/header';
import {
    addBrowserToTree, addResultToTree,
    addSuiteToTree, generateResultId,
    mkConnectedComponent,
    mkEmptyTree,
    mkRealStore,
    renderWithStore
} from '../../../utils';

describe('<ScreenshotAccepterHeader/>', () => {
    const sandbox = sinon.sandbox.create();

    const DEFAULT_PROPS = {
        view: {diffMode: DiffModes.THREE_UP_SCALED},
        actions: {changeDiffMode: sinon.stub().returns({type: 'some-type'})},
        totalImages: 2,
        acceptedImages: 0,
        images: [{
            id: 'default-image-id',
            parentId: 'default-result-id'
        }],
        stateNameImageIds: ['default-browser default-state-name'],
        retryIndex: 0,
        showMeta: false,
        activeImageIndex: 0,
        staticImageAccepter: {accepterDelayedImages: []},
        onShowMeta: () => {},
        onClose: () => {},
        onRetryChange: () => {},
        onActiveImageChange: () => {},
        onScreenshotAccept: () => {},
        onScreenshotUndo: () => {}
    };

    const mkHeaderComponent = (props = {}) => {
        props = defaults(props, DEFAULT_PROPS);

        return mkConnectedComponent(<ScreenshotAccepterHeader {...props} />);
    };

    afterEach(() => {
        sandbox.restore();
    });

    [
        {
            btnName: 'Arrow Up',
            btnTitle: 'Show previous image'
        },
        {
            btnName: 'Arrow Down',
            btnTitle: 'Show next image'
        }
    ].forEach(({btnName, btnTitle}) => {
        describe(`"${btnName}" button`, () => {
            it('should be disabled if the current image is the last', () => {
                const component = mkHeaderComponent({stateNameImageIds: ['state1']});

                assert.isTrue(component.getByTitle(btnTitle, {exact: false}).disabled);
            });

            it('should be disabled if there are no images left', () => {
                const component = mkHeaderComponent({stateNameImageIds: []});

                assert.isTrue(component.getByTitle(btnTitle, {exact: false}).disabled);
            });
        });
    });

    describe('"Arrow Up" button', () => {
        [
            {
                name: 'with previous image index',
                activeImageIndex: 2,
                expectedActiveImageIndex: 1
            },
            {
                name: 'with last image index if there are no previous images',
                activeImageIndex: 0,
                expectedActiveImageIndex: 2
            }
        ].forEach(({name, activeImageIndex, expectedActiveImageIndex}) => {
            it(`should call "onActiveImageChange" ${name} on click`, async () => {
                const user = userEvent.setup();
                const onActiveImageChange = sandbox.stub();
                const component = mkHeaderComponent({
                    activeImageIndex,
                    stateNameImageIds: ['state1', 'state2', 'state3'],
                    onActiveImageChange
                });

                await user.click(component.getByTitle('Show previous image', {exact: false}));

                assert.calledOnceWith(onActiveImageChange, expectedActiveImageIndex);
            });
        });

        [
            {
                name: 'with previous image index',
                activeImageIndex: 2,
                expectedActiveImageIndex: 1
            },
            {
                name: 'with last image index if there are no previous images',
                activeImageIndex: 0,
                expectedActiveImageIndex: 2
            }
        ].forEach(({name, activeImageIndex, expectedActiveImageIndex}) => {
            it(`should call "onActiveImageChange" ${name} on press on related keys`, async () => {
                const user = userEvent.setup();
                const onActiveImageChange = sandbox.stub();
                mkHeaderComponent({
                    activeImageIndex,
                    stateNameImageIds: ['state1', 'state2', 'state3'],
                    onActiveImageChange
                });

                await user.keyboard('{ArrowUp}');

                assert.calledOnceWith(onActiveImageChange, expectedActiveImageIndex);
            });
        });
    });

    describe('"Arrow Down" button', () => {
        [
            {
                name: 'with next image index',
                activeImageIndex: 0,
                expectedActiveImageIndex: 1
            },
            {
                name: 'with first image index if there are no next images',
                activeImageIndex: 2,
                expectedActiveImageIndex: 0
            }
        ].forEach(({name, activeImageIndex, expectedActiveImageIndex}) => {
            it(`should call "onActiveImageChange" ${name} on click`, async () => {
                const user = userEvent.setup();
                const onActiveImageChange = sandbox.stub();
                const component = mkHeaderComponent({
                    activeImageIndex,
                    stateNameImageIds: ['state1', 'state2', 'state3'],
                    onActiveImageChange
                });

                await user.click(component.getByTitle('Show next image', {exact: false}));

                assert.calledOnceWith(onActiveImageChange, expectedActiveImageIndex);
            });
        });

        [
            {
                name: 'with next image index',
                activeImageIndex: 0,
                expectedActiveImageIndex: 1
            },
            {
                name: 'with first image index if there are no next images',
                activeImageIndex: 2,
                expectedActiveImageIndex: 0
            }
        ].forEach(({name, activeImageIndex, expectedActiveImageIndex}) => {
            it(`should call "onActiveImageChange" ${name} on press on related keys`, async () => {
                const user = userEvent.setup();
                const onActiveImageChange = sandbox.stub();
                mkHeaderComponent({
                    activeImageIndex,
                    stateNameImageIds: ['state1', 'state2', 'state3'],
                    onActiveImageChange
                });

                await user.keyboard('{ArrowDown}');

                assert.calledOnceWith(onActiveImageChange, expectedActiveImageIndex);
            });
        });
    });

    describe('"Accept" button', () => {
        it('should be disabled if passed empty "images" array', () => {
            const component = mkHeaderComponent({images: []});

            assert.isTrue(component.getByTestId('screenshot-accepter-accept').disabled);
        });

        it('should be enabled if passed not empty "images" array', () => {
            const component = mkHeaderComponent({images: [{id: 'img-1', parentId: 'res-1'}]});

            assert.isFalse(component.getByTestId('screenshot-accepter-accept').disabled);
        });

        it('should call "onScreenshotAccept" handler with current image id on click', async () => {
            const user = userEvent.setup();
            const onScreenshotAccept = sandbox.stub();
            const tree = mkEmptyTree();
            addSuiteToTree({tree, suiteName: 'test-1'});
            addBrowserToTree({tree, suiteName: 'test-1', browserName: 'bro-1'});
            addResultToTree({tree, suiteName: 'test-1', browserName: 'bro-1', attempt: 0});
            addResultToTree({tree, suiteName: 'test-1', browserName: 'bro-1', attempt: 1});
            const store = mkRealStore({initialState: {tree}});

            const component = renderWithStore(<ScreenshotAccepterHeader {...defaults({
                images: [
                    {id: 'img-1', parentId: generateResultId({suiteName: 'test-1', browserName: 'bro-1', attempt: 0})},
                    {id: 'img-2', parentId: generateResultId({suiteName: 'test-1', browserName: 'bro-1', attempt: 1})}
                ],
                retryIndex: 1,
                onScreenshotAccept
            }, DEFAULT_PROPS)}/>, store);

            await user.click(component.getByTestId('screenshot-accepter-accept'));

            assert.calledOnceWith(onScreenshotAccept, 'img-2');
        });

        it('should call "onScreenshotAccept" handler with current image id on press on related keys', async () => {
            const user = userEvent.setup();
            const onScreenshotAccept = sandbox.stub();
            const tree = mkEmptyTree();
            addSuiteToTree({tree, suiteName: 'test-1'});
            addBrowserToTree({tree, suiteName: 'test-1', browserName: 'bro-1'});
            addResultToTree({tree, suiteName: 'test-1', browserName: 'bro-1', attempt: 0});
            addResultToTree({tree, suiteName: 'test-1', browserName: 'bro-1', attempt: 1});
            const store = mkRealStore({initialState: {tree}});

            renderWithStore(<ScreenshotAccepterHeader {...defaults({
                images: [
                    {id: 'img-1', parentId: generateResultId({suiteName: 'test-1', browserName: 'bro-1', attempt: 0})},
                    {id: 'img-2', parentId: generateResultId({suiteName: 'test-1', browserName: 'bro-1', attempt: 1})}
                ],
                retryIndex: 1,
                onScreenshotAccept
            }, DEFAULT_PROPS)}/>, store);

            await user.keyboard('{Enter}');

            assert.calledOnceWith(onScreenshotAccept, 'img-2');
        });
    });

    describe('<RetrySwitcher /> component', () => {
        it('should render correctly', () => {
            const onRetryChange = sandbox.stub();
            const tree = mkEmptyTree();
            addSuiteToTree({tree, suiteName: 'test-1'});
            addBrowserToTree({tree, suiteName: 'test-1', browserName: 'bro-1'});
            addResultToTree({tree, suiteName: 'test-1', browserName: 'bro-1', attempt: 0});
            addResultToTree({tree, suiteName: 'test-1', browserName: 'bro-1', attempt: 1});
            const store = mkRealStore({initialState: {tree}});

            const component = renderWithStore(<ScreenshotAccepterHeader {...defaults({
                images: [
                    {id: 'img-1', parentId: generateResultId({suiteName: 'test-1', browserName: 'bro-1', attempt: 0})},
                    {id: 'img-2', parentId: generateResultId({suiteName: 'test-1', browserName: 'bro-1', attempt: 1})}
                ],
                retryIndex: 1,
                onRetryChange
            }, DEFAULT_PROPS)}/>, store);

            expect(component.queryAllByTitle('Switch to selected attempt (left: ←,a; right: →,d)').length).to.equal(2);
        });

        it('should call "onRetryChange" handler on call "onChange" prop with new retry index', async () => {
            const user = userEvent.setup();
            const onRetryChange = sandbox.stub();
            const tree = mkEmptyTree();
            addSuiteToTree({tree, suiteName: 'test-1'});
            addBrowserToTree({tree, suiteName: 'test-1', browserName: 'bro-1'});
            addResultToTree({tree, suiteName: 'test-1', browserName: 'bro-1', attempt: 0});
            addResultToTree({tree, suiteName: 'test-1', browserName: 'bro-1', attempt: 1});
            const store = mkRealStore({initialState: {tree}});

            const component = renderWithStore(<ScreenshotAccepterHeader {...defaults({
                images: [
                    {id: 'img-1', parentId: generateResultId({suiteName: 'test-1', browserName: 'bro-1', attempt: 0})},
                    {id: 'img-2', parentId: generateResultId({suiteName: 'test-1', browserName: 'bro-1', attempt: 1})}
                ],
                retryIndex: 1,
                onRetryChange
            }, DEFAULT_PROPS)}/>, store);

            await user.click(component.getByText('1', {selector: 'button[data-qa="retry-switcher"] > *'}));

            assert.calledOnceWith(onRetryChange, 0);
        });

        describe('on press on related keys', () => {
            it('should call "onRetryChange" with previous retry index', async () => {
                const user = userEvent.setup();
                const onRetryChange = sandbox.stub();
                const tree = mkEmptyTree();
                addSuiteToTree({tree, suiteName: 'test-1'});
                addBrowserToTree({tree, suiteName: 'test-1', browserName: 'bro-1'});
                addResultToTree({tree, suiteName: 'test-1', browserName: 'bro-1', attempt: 0});
                addResultToTree({tree, suiteName: 'test-1', browserName: 'bro-1', attempt: 1});
                const store = mkRealStore({initialState: {tree}});

                renderWithStore(<ScreenshotAccepterHeader {...defaults({
                    images: [
                        {id: 'img-1', parentId: generateResultId({suiteName: 'test-1', browserName: 'bro-1', attempt: 0})},
                        {id: 'img-2', parentId: generateResultId({suiteName: 'test-1', browserName: 'bro-1', attempt: 1})}
                    ],
                    retryIndex: 1,
                    onRetryChange
                }, DEFAULT_PROPS)}/>, store);

                await user.keyboard('{ArrowLeft}');

                assert.calledOnceWith(onRetryChange, 0);
            });

            it('should call "onRetryChange" with last retry index if current retry is first', async () => {
                const user = userEvent.setup();
                const onRetryChange = sandbox.stub();
                const tree = mkEmptyTree();
                addSuiteToTree({tree, suiteName: 'test-1'});
                addBrowserToTree({tree, suiteName: 'test-1', browserName: 'bro-1'});
                addResultToTree({tree, suiteName: 'test-1', browserName: 'bro-1', attempt: 0});
                addResultToTree({tree, suiteName: 'test-1', browserName: 'bro-1', attempt: 1});
                const store = mkRealStore({initialState: {tree}});

                renderWithStore(<ScreenshotAccepterHeader {...defaults({
                    images: [
                        {id: 'img-1', parentId: generateResultId({suiteName: 'test-1', browserName: 'bro-1', attempt: 0})},
                        {id: 'img-2', parentId: generateResultId({suiteName: 'test-1', browserName: 'bro-1', attempt: 1})}
                    ],
                    retryIndex: 0,
                    onRetryChange
                }, DEFAULT_PROPS)}/>, store);

                await user.keyboard('{ArrowLeft}');

                assert.calledOnceWith(onRetryChange, 1);
            });

            it('should call "onRetryChange" with next retry index', async () => {
                const user = userEvent.setup();
                const onRetryChange = sandbox.stub();
                const tree = mkEmptyTree();
                addSuiteToTree({tree, suiteName: 'test-1'});
                addBrowserToTree({tree, suiteName: 'test-1', browserName: 'bro-1'});
                addResultToTree({tree, suiteName: 'test-1', browserName: 'bro-1', attempt: 0});
                addResultToTree({tree, suiteName: 'test-1', browserName: 'bro-1', attempt: 1});
                const store = mkRealStore({initialState: {tree}});

                renderWithStore(<ScreenshotAccepterHeader {...defaults({
                    images: [
                        {id: 'img-1', parentId: generateResultId({suiteName: 'test-1', browserName: 'bro-1', attempt: 0})},
                        {id: 'img-2', parentId: generateResultId({suiteName: 'test-1', browserName: 'bro-1', attempt: 1})}
                    ],
                    retryIndex: 0,
                    onRetryChange
                }, DEFAULT_PROPS)}/>, store);

                await user.keyboard('{ArrowRight}');

                assert.calledOnceWith(onRetryChange, 1);
            });

            it('should call "onRetryChange" with first retry index if current retry is last', async () => {
                const user = userEvent.setup();
                const onRetryChange = sandbox.stub();
                const tree = mkEmptyTree();
                addSuiteToTree({tree, suiteName: 'test-1'});
                addBrowserToTree({tree, suiteName: 'test-1', browserName: 'bro-1'});
                addResultToTree({tree, suiteName: 'test-1', browserName: 'bro-1', attempt: 0});
                addResultToTree({tree, suiteName: 'test-1', browserName: 'bro-1', attempt: 1});
                const store = mkRealStore({initialState: {tree}});

                renderWithStore(<ScreenshotAccepterHeader {...defaults({
                    images: [
                        {id: 'img-1', parentId: generateResultId({suiteName: 'test-1', browserName: 'bro-1', attempt: 0})},
                        {id: 'img-2', parentId: generateResultId({suiteName: 'test-1', browserName: 'bro-1', attempt: 1})}
                    ],
                    retryIndex: 1,
                    onRetryChange
                }, DEFAULT_PROPS)}/>, store);

                await user.keyboard('{ArrowRight}');

                assert.calledOnceWith(onRetryChange, 0);
            });
        });
    });

    describe('"Show meta" button', () => {
        it('should be disabled if there are no images to accept', () => {
            const component = mkHeaderComponent({images: []});

            assert.isTrue(component.getByTitle('Show test meta info').disabled);
        });

        it('should be enabled if passed not empty "images" array', () => {
            const component = mkHeaderComponent({images: [{id: 'img-1', parentId: 'res-1'}]});

            assert.isFalse(component.getByTitle('Show test meta info').disabled);
        });
    });

    describe('"Undo" button', () => {
        it('should be disabled if no screenshotes were accepted', () => {
            const component = mkHeaderComponent({acceptedImages: 0});

            assert.isTrue(component.getByTestId('screenshot-accepter-undo').disabled);
        });

        it('should call "onScreenshotUndo" handler on click', async () => {
            const user = userEvent.setup();
            const onScreenshotUndo = sandbox.stub();
            const component = mkHeaderComponent({onScreenshotUndo, acceptedImages: 1});

            await user.click(component.getByTestId('screenshot-accepter-undo'));

            assert.calledOnce(onScreenshotUndo);
        });
    });

    describe('"Close screenshot accepting mode" button', () => {
        it('should call "onClose" handler on click', async () => {
            const user = userEvent.setup();
            const onClose = sandbox.stub();
            const component = mkHeaderComponent({onClose});

            await user.click(component.getByTestId('screenshot-accepter-switch-accept-mode'));

            assert.calledOnce(onClose);
        });

        it('should call "onClose" handler on press on related keys', async () => {
            const user = userEvent.setup();
            const onClose = sandbox.stub();
            mkHeaderComponent({onClose});

            await user.keyboard('{Esc}');

            assert.calledOnce(onClose);
        });
    });
});
