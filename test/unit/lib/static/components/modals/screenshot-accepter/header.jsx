import React from 'react';
import {defaults} from 'lodash';
import proxyquire from 'proxyquire';
import {mkConnectedComponent} from '../../utils';
import diffModes from '../../../../../../../lib/constants/diff-modes';

describe('<ScreenshotAccepterHeader/>', () => {
    const sandbox = sinon.sandbox.create();
    let ScreenshotAccepterHeader, RetrySwitcher, GlobalHotKeys, events;

    const mkKeyDownEvent = (opts = {}) => {
        return {...opts, preventDefault: () => {}};
    };

    const mkHeaderComponent = (props = {}) => {
        props = defaults(props, {
            view: {diffMode: diffModes.THREE_UP_SCALED},
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
            onShowMeta: () => {},
            onClose: () => {},
            onRetryChange: () => {},
            onActiveImageChange: () => {},
            onScreenshotAccept: () => {},
            onScreenshotUndo: () => {}
        });

        return mkConnectedComponent(<ScreenshotAccepterHeader {...props} />);
    };

    beforeEach(() => {
        events = {};
        global.window.addEventListener = sandbox.stub().callsFake((event, cb) => {
            events[event] = cb;
        });

        RetrySwitcher = sandbox.stub().returns(null);
        GlobalHotKeys = sandbox.stub().returns(null);

        ScreenshotAccepterHeader = proxyquire('lib/static/components/modals/screenshot-accepter/header', {
            'react-hotkeys': {GlobalHotKeys},
            '../../retry-switcher': {default: RetrySwitcher}
        }).default;
    });

    afterEach(() => {
        global.window.addEventListener = () => {};
        sandbox.restore();
    });

    [
        {
            btnName: 'Arrow Up',
            btnClass: '.screenshot-accepter__arrow-up-btn'
        },
        {
            btnName: 'Arrow Down',
            btnClass: '.screenshot-accepter__arrow-down-btn'
        }
    ].forEach(({btnName, btnClass}) => {
        describe(`"${btnName}" button`, () => {
            it('should be disabled if the current image is the last', () => {
                const component = mkHeaderComponent({stateNameImageIds: ['state1']});

                assert.isTrue(component.find(btnClass).prop('disabled'));
            });

            it('should be disabled if there are no images left', () => {
                const component = mkHeaderComponent({stateNameImageIds: []});

                assert.isTrue(component.find(btnClass).prop('disabled'));
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
            it(`should call "onActiveImageChange" ${name} on click`, () => {
                const onActiveImageChange = sandbox.stub();
                const component = mkHeaderComponent({
                    activeImageIndex,
                    stateNameImageIds: ['state1', 'state2', 'state3'],
                    onActiveImageChange
                });

                component.find('.screenshot-accepter__arrow-up-btn').simulate('click');

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
            it(`should call "onActiveImageChange" ${name} on press on related keys`, () => {
                const onActiveImageChange = sandbox.stub();
                const component = mkHeaderComponent({
                    activeImageIndex,
                    stateNameImageIds: ['state1', 'state2', 'state3'],
                    onActiveImageChange
                });

                const {PREV_SCREENSHOT: handler} = component.find(GlobalHotKeys).prop('handlers');
                handler(mkKeyDownEvent());

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
            it(`should call "onActiveImageChange" ${name} on click`, () => {
                const onActiveImageChange = sandbox.stub();
                const component = mkHeaderComponent({
                    activeImageIndex,
                    stateNameImageIds: ['state1', 'state2', 'state3'],
                    onActiveImageChange
                });

                component.find('.screenshot-accepter__arrow-down-btn').simulate('click');

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
            it(`should call "onActiveImageChange" ${name} on press on related keys`, () => {
                const onActiveImageChange = sandbox.stub();
                const component = mkHeaderComponent({
                    activeImageIndex,
                    stateNameImageIds: ['state1', 'state2', 'state3'],
                    onActiveImageChange
                });

                const {NEXT_SCREENSHOT: handler} = component.find(GlobalHotKeys).prop('handlers');
                handler(mkKeyDownEvent());

                assert.calledOnceWith(onActiveImageChange, expectedActiveImageIndex);
            });
        });
    });

    describe('"Accept" button', () => {
        it('should be disabled if passed empty "images" array', () => {
            const component = mkHeaderComponent({images: []});

            assert.isTrue(component.find('[label="✔ Accept"]').prop('isDisabled'));
        });

        it('should be enabled if passed not empty "images" array', () => {
            const component = mkHeaderComponent({images: [{id: 'img-1', parentId: 'res-1'}]});

            assert.isFalse(component.find('[label="✔ Accept"]').prop('isDisabled'));
        });

        it('should call "onScreenshotAccept" handler with current image id on click', () => {
            const onScreenshotAccept = sandbox.stub();
            const component = mkHeaderComponent({
                images: [
                    {id: 'img-1', parentId: 'res-1'},
                    {id: 'img-2', parentId: 'res-2'}
                ],
                retryIndex: 1,
                onScreenshotAccept
            });

            component.find('[label="✔ Accept"]').simulate('click');

            assert.calledOnceWith(onScreenshotAccept, 'img-2');
        });

        it('should call "onScreenshotAccept" handler with current image id on press on related keys', () => {
            const onScreenshotAccept = sandbox.stub();
            const component = mkHeaderComponent({
                images: [
                    {id: 'img-1', parentId: 'res-1'},
                    {id: 'img-2', parentId: 'res-2'}
                ],
                retryIndex: 1,
                onScreenshotAccept
            });

            const {ACCEPT_SCREENSHOT: handler} = component.find(GlobalHotKeys).prop('handlers');
            handler(mkKeyDownEvent());

            assert.calledOnceWith(onScreenshotAccept, 'img-2');
        });
    });

    describe('<RetrySwitcher /> component', () => {
        it('should render with correct props', () => {
            const onRetryChange = sandbox.stub();
            mkHeaderComponent({
                images: [
                    {id: 'img-1', parentId: 'res-1'},
                    {id: 'img-2', parentId: 'res-2'}
                ],
                retryIndex: 0,
                onRetryChange
            });

            assert.calledOnceWith(RetrySwitcher, {
                title: 'Switch to selected attempt (left: ←,a; right: →,d)',
                resultIds: ['res-1', 'res-2'],
                retryIndex: 0,
                onChange: onRetryChange
            });
        });

        it('should call "onRetryChange" handler on call "onChange" prop with new retry index', () => {
            const onRetryChange = sandbox.stub();
            mkHeaderComponent({
                images: [
                    {id: 'img-1', parentId: 'res-1'},
                    {id: 'img-2', parentId: 'res-2'}
                ],
                retryIndex: 0,
                onRetryChange
            });

            RetrySwitcher.firstCall.args[0].onChange(1);

            assert.calledOnceWith(onRetryChange, 1);
        });

        describe('on press on related keys', () => {
            it('should call "onRetryChange" with previous retry index', () => {
                const onRetryChange = sandbox.stub();
                const component = mkHeaderComponent({
                    images: [
                        {id: 'img-1', parentId: 'res-1'},
                        {id: 'img-2', parentId: 'res-2'}
                    ],
                    retryIndex: 1,
                    onRetryChange
                });

                const {PREV_RETRY: handler} = component.find(GlobalHotKeys).prop('handlers');
                handler(mkKeyDownEvent());

                assert.calledOnceWith(onRetryChange, 0);
            });

            it('should call "onRetryChange" with last retry index if current retry is first', () => {
                const onRetryChange = sandbox.stub();
                const component = mkHeaderComponent({
                    images: [
                        {id: 'img-1', parentId: 'res-1'},
                        {id: 'img-2', parentId: 'res-2'}
                    ],
                    retryIndex: 0,
                    onRetryChange
                });

                const {PREV_RETRY: handler} = component.find(GlobalHotKeys).prop('handlers');
                handler(mkKeyDownEvent());

                assert.calledOnceWith(onRetryChange, 1);
            });
        });

        describe('on press on related keys', () => {
            it('should call "onRetryChange" with next retry index', () => {
                const onRetryChange = sandbox.stub();
                const component = mkHeaderComponent({
                    images: [
                        {id: 'img-1', parentId: 'res-1'},
                        {id: 'img-2', parentId: 'res-2'}
                    ],
                    retryIndex: 0,
                    onRetryChange
                });

                const {NEXT_RETRY: handler} = component.find(GlobalHotKeys).prop('handlers');
                handler(mkKeyDownEvent());

                assert.calledOnceWith(onRetryChange, 1);
            });

            it('should call "onRetryChange" with first retry index if current retry is last', () => {
                const onRetryChange = sandbox.stub();
                const component = mkHeaderComponent({
                    images: [
                        {id: 'img-1', parentId: 'res-1'},
                        {id: 'img-2', parentId: 'res-2'}
                    ],
                    retryIndex: 1,
                    onRetryChange
                });

                const {NEXT_RETRY: handler} = component.find(GlobalHotKeys).prop('handlers');
                handler(mkKeyDownEvent());

                assert.calledOnceWith(onRetryChange, 0);
            });
        });
    });

    describe('"Show meta" button', () => {
        const metaSelector = '[label="Show meta"]';

        it('should be disabled if there are no images to accept', () => {
            const component = mkHeaderComponent({images: []});

            assert.isTrue(component.find(metaSelector).prop('isDisabled'));
        });

        it('should be enabled if passed not empty "images" array', () => {
            const component = mkHeaderComponent({images: [{id: 'img-1', parentId: 'res-1'}]});

            assert.isFalse(component.find(metaSelector).prop('isDisabled'));
        });
    });

    describe('"Undo" button', () => {
        it('should be disabled if no screenshotes were accepted', () => {
            const component = mkHeaderComponent({acceptedImages: 0});

            assert.isTrue(component.find('.screenshot-accepter__undo-btn').prop('disabled'));
        });

        it('should call "onScreenshotUndo" handler on click', () => {
            const onScreenshotUndo = sandbox.stub();
            const component = mkHeaderComponent({onScreenshotUndo, acceptedImages: 1});

            component.find('[label="⎌ Undo"]').simulate('click');

            assert.calledOnce(onScreenshotUndo);
        });
    });

    describe('"Close screenshot accepting mode" button', () => {
        it('should call "onClose" handler on click', () => {
            const onClose = sandbox.stub();
            const component = mkHeaderComponent({onClose});

            component.find('.screenshot-accepter__arrows-close-btn').simulate('click');

            assert.calledOnce(onClose);
        });

        it('should call "onClose" handler on press on related keys', () => {
            const onClose = sandbox.stub();
            const component = mkHeaderComponent({onClose});

            const {CLOSE_MODAL: handler} = component.find(GlobalHotKeys).prop('handlers');
            handler(mkKeyDownEvent());

            assert.calledOnce(onClose);
        });
    });
});
