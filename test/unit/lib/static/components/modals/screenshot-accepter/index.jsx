import React from 'react';
import ReactDOM from 'react-dom';
import {defaults} from 'lodash';
import proxyquire from 'proxyquire';
import {EXPAND_ALL} from 'lib/constants/expand-modes';
import {mkConnectedComponent} from '../../utils';

describe('<ScreenshotAccepter/>', () => {
    const sandbox = sinon.sandbox.create();
    let ScreenshotAccepter, ScreenshotAccepterHeader, ScreenshotAccepterMeta, ScreenshotAccepterBody;
    let actionsStub, selectors, parentNode, preloadImageStub;

    const mkResult = (opts) => {
        const result = defaults(opts, {
            id: 'default-result-id',
            parentId: 'default-bro-id',
            imageIds: []
        });

        return {[result.id]: result};
    };

    const mkImage = (opts) => {
        return defaults(opts, {
            id: 'default-image-id',
            parentId: 'default-result-id',
            stateName: 'default-state-name'
        });
    };

    const mkStateTree = ({resultsById = {}} = {}) => {
        return {
            results: {byId: resultsById}
        };
    };

    const mkScreenshotAccepterComponent = (props = {}, initialState = {}) => {
        if (!global.Element.prototype.scrollTo) {
            global.Element.prototype.scrollTo = () => {}; // scrollTo isn't implemented in JSDOM
        }
        props = defaults(props, {
            image: mkImage(),
            onClose: sandbox.stub()
        });
        initialState = defaults(initialState, {
            tree: mkStateTree(),
            view: {expand: EXPAND_ALL}
        });

        return mkConnectedComponent(<ScreenshotAccepter {...props} />, {initialState});
    };

    beforeEach(() => {
        actionsStub = {
            changeDiffMode: sandbox.stub().returns({type: 'some-type'}),
            screenshotAccepterAccept: sandbox.stub().returns({type: 'some-type'}),
            undoAcceptImage: sandbox.stub().returns({type: 'some-type'}),
            applyDelayedTestResults: sandbox.stub().returns({type: 'some-type'})
        };

        selectors = {
            getAcceptableImagesByStateName: sandbox.stub().returns({})
        };

        parentNode = {
            scrollTo: sandbox.stub()
        };

        ScreenshotAccepterHeader = sandbox.stub().returns(null);
        ScreenshotAccepterMeta = sandbox.stub().returns(null);
        ScreenshotAccepterBody = sandbox.stub().returns(null);

        sandbox.stub(ReactDOM, 'findDOMNode').returns({parentNode});
        preloadImageStub = sandbox.stub();

        ScreenshotAccepter = proxyquire('lib/static/components/modals/screenshot-accepter', {
            './header': {default: ScreenshotAccepterHeader},
            './meta': {default: ScreenshotAccepterMeta},
            './body': {default: ScreenshotAccepterBody},
            '../../../modules/actions': actionsStub,
            '../../../modules/selectors/tree': selectors,
            '../../../modules/utils': {preloadImage: preloadImageStub}
        }).default;
    });

    afterEach(() => sandbox.restore());

    describe('"ScreenshotAccepterHeader"', () => {
        it('should render with correct props', () => {
            const image = mkImage({id: 'img-1', parentId: 'res-1', stateName: 'plain'});
            const resultsById = mkResult({id: 'res-1', parentId: 'bro-1', imageIds: ['img-1']});
            const tree = mkStateTree({resultsById});
            selectors.getAcceptableImagesByStateName.returns({'bro-1 plain': [image]});

            mkScreenshotAccepterComponent({image}, {tree});

            assert.calledWithMatch(
                ScreenshotAccepterHeader,
                {
                    actions: {
                        changeDiffMode: sinon.match.func
                    },
                    view: {
                        diffMode: '3-up'
                    },
                    images: [image],
                    stateNameImageIds: ['bro-1 plain'],
                    retryIndex: 0,
                    activeImageIndex: 0,
                    showMeta: false,
                    acceptedImages: 0,
                    totalImages: 1,
                    onClose: sinon.match.func,
                    onRetryChange: sinon.match.func,
                    onActiveImageChange: sinon.match.func,
                    onScreenshotAccept: sinon.match.func,
                    onScreenshotUndo: sinon.match.func,
                    onShowMeta: sinon.match.func
                }
            );
        });

        describe('"onRetryChange" handler', () => {
            it('should change retry index on call', () => {
                const image1 = mkImage({id: 'img-1', parentId: 'res-1', stateName: 'plain'});
                const image2 = mkImage({id: 'img-2', parentId: 'res-2', stateName: 'plain'});
                const resultsById = {
                    ...mkResult({id: 'res-1', parentId: 'bro-1', imageIds: ['img-1']}),
                    ...mkResult({id: 'res-2', parentId: 'bro-1', imageIds: ['img-2']})
                };
                const tree = mkStateTree({resultsById});
                selectors.getAcceptableImagesByStateName.returns({'bro-1 plain': [image1, image2]});

                mkScreenshotAccepterComponent({image: image1}, {tree});
                ScreenshotAccepterHeader.firstCall.args[0].onRetryChange(1);

                assert.calledWithMatch(ScreenshotAccepterHeader.firstCall, {retryIndex: 0});
                assert.calledWithMatch(ScreenshotAccepterHeader.secondCall, {retryIndex: 1});
            });
        });

        describe('"onActiveImageChange" handler', () => {
            [
                {
                    name: 'retry index on last in active images',
                    expectedFirst: {retryIndex: 0},
                    expectedSecond: {retryIndex: 0}
                },
                {
                    name: 'active image index on passed',
                    expectedFirst: {activeImageIndex: 0},
                    expectedSecond: {activeImageIndex: 1}
                }
            ].forEach(({name, expectedFirst, expectedSecond}) => {
                it(`should change ${name}`, () => {
                    const image1 = mkImage({id: 'img-1', parentId: 'res-1', stateName: 'plain'});
                    const image2 = mkImage({id: 'img-2', parentId: 'res-2', stateName: 'plain2'});
                    const resultsById = {
                        ...mkResult({id: 'res-1', parentId: 'bro-1', imageIds: ['img-1']}),
                        ...mkResult({id: 'res-2', parentId: 'bro-1', imageIds: ['img-2']})
                    };
                    const tree = mkStateTree({resultsById});
                    selectors.getAcceptableImagesByStateName.returns({
                        'bro-1 plain': [image1],
                        'bro-1 plain2': [image2]
                    });

                    mkScreenshotAccepterComponent({image: image1}, {tree});
                    ScreenshotAccepterHeader.firstCall.args[0].onActiveImageChange(1);

                    assert.calledWithMatch(ScreenshotAccepterHeader.firstCall, expectedFirst);
                    assert.calledWithMatch(ScreenshotAccepterHeader.secondCall, expectedSecond);
                });
            });
        });

        describe('"onScreenshotAccept" handler', () => {
            it('should call "screenshotAccepterAccept" action', async () => {
                const image = mkImage({id: 'img-1', parentId: 'res-1', stateName: 'plain'});
                const resultsById = mkResult({id: 'res-1', parentId: 'bro-1', imageIds: ['img-1']});
                const tree = mkStateTree({resultsById});
                selectors.getAcceptableImagesByStateName.returns({'bro-1 plain': [image]});

                mkScreenshotAccepterComponent({image}, {tree});
                await ScreenshotAccepterHeader.firstCall.args[0].onScreenshotAccept('img-1');

                assert.calledOnceWith(actionsStub.screenshotAccepterAccept, 'img-1');
            });
        });

        describe('"onShowMeta" handler', () => {
            it('should invert state "showMeta"', () => {
                const image = mkImage({id: 'img-1', parentId: 'res-1', stateName: 'plain'});
                const resultsById = mkResult({id: 'res-1', parentId: 'bro-1', imageIds: ['img-1']});
                const tree = mkStateTree({resultsById});
                selectors.getAcceptableImagesByStateName.returns({'bro-1 plain': [image]});

                mkScreenshotAccepterComponent({image}, {tree});

                ScreenshotAccepterHeader.firstCall.args[0].onShowMeta();

                assert.calledTwice(ScreenshotAccepterHeader);
                assert.calledWith(ScreenshotAccepterHeader.secondCall, sinon.match({
                    showMeta: true
                }));
            });
        });

        describe('"onScreenshotUndo" handler', () => {
            it('should call "undoAcceptImages" action', async () => {
                const image = mkImage({id: 'img-1', parentId: 'res-1', stateName: 'plain'});
                const resultsById = mkResult({id: 'res-1', parentId: 'bro-1', imageIds: ['img-1']});
                const tree = mkStateTree({resultsById});
                selectors.getAcceptableImagesByStateName.returns({'bro-1 plain': [image]});
                mkScreenshotAccepterComponent({image}, {tree});
                await ScreenshotAccepterHeader.firstCall.args[0].onScreenshotAccept('img-1');

                await ScreenshotAccepterHeader.firstCall.args[0].onScreenshotUndo();

                assert.calledOnceWith(actionsStub.undoAcceptImage, sinon.match.any, {skipTreeUpdate: true});
            });
        });
    });

    describe('"ScreenshotAccepterMeta"', () => {
        it('should render with correct props', () => {
            const image = mkImage({id: 'img-1', parentId: 'res-1', stateName: 'plain'});
            const resultsById = mkResult({id: 'res-1', parentId: 'bro-1', imageIds: ['img-1']});
            const tree = mkStateTree({resultsById});
            selectors.getAcceptableImagesByStateName.returns({'bro-1 plain': [image]});

            mkScreenshotAccepterComponent({image}, {tree});

            assert.calledOnceWith(
                ScreenshotAccepterMeta,
                {
                    showMeta: false,
                    image
                }
            );
        });
    });

    describe('"ScreenshotAccepterBody"', () => {
        it('should render body with "image" props', () => {
            const image = mkImage({id: 'img-1', parentId: 'res-1', stateName: 'plain'});
            const resultsById = mkResult({id: 'res-1', parentId: 'bro-1', imageIds: ['img-1']});
            const tree = mkStateTree({resultsById});
            selectors.getAcceptableImagesByStateName.returns({'bro-1 plain': [image]});

            mkScreenshotAccepterComponent({image}, {tree});

            assert.calledOnceWith(ScreenshotAccepterBody, {image});
        });

        describe('"onRetryChange" handler', () => {
            it('should change passed image on switch retry index', () => {
                const image1 = mkImage({id: 'img-1', parentId: 'res-1', stateName: 'plain'});
                const image2 = mkImage({id: 'img-2', parentId: 'res-1', stateName: 'plain'});
                const resultsById = mkResult({id: 'res-1', parentId: 'bro-1', imageIds: ['img-1', 'img-2']});
                const tree = mkStateTree({resultsById});
                selectors.getAcceptableImagesByStateName.returns({'bro-1 plain': [image1, image2]});

                mkScreenshotAccepterComponent({image: image1}, {tree});
                ScreenshotAccepterHeader.firstCall.args[0].onRetryChange(1);

                assert.calledWithMatch(ScreenshotAccepterBody.firstCall, {image: image1});
                assert.calledWithMatch(ScreenshotAccepterBody.secondCall, {image: image2});
            });
        });

        describe('"onActiveImageChange" handler', () => {
            it('should change passed image on switch to the next image', () => {
                const image1 = mkImage({id: 'img-1', parentId: 'res-1', stateName: 'plain'});
                const image2 = mkImage({id: 'img-2', parentId: 'res-2', stateName: 'plain2'});
                const resultsById = mkResult({id: 'res-1', parentId: 'bro-1', imageIds: ['img-1', 'img-2']});
                const tree = mkStateTree({resultsById});
                selectors.getAcceptableImagesByStateName.returns({
                    'bro-1 plain': [image1],
                    'bro-1 plain2': [image2]
                });

                mkScreenshotAccepterComponent({image: image1}, {tree});
                ScreenshotAccepterHeader.firstCall.args[0].onActiveImageChange(1);

                assert.calledWithMatch(ScreenshotAccepterBody.firstCall, {image: image1});
                assert.calledWithMatch(ScreenshotAccepterBody.secondCall, {image: image2});
            });
        });
    });

    describe('onClose', () => {
        beforeEach(() => {
            const image = mkImage({id: 'img-1', parentId: 'res-1', stateName: 'plain'});
            const resultsById = mkResult({id: 'res-1', parentId: 'bro-1', imageIds: ['img-1']});
            const tree = mkStateTree({resultsById});
            selectors.getAcceptableImagesByStateName.returns({'bro-1 plain': [image]});

            mkScreenshotAccepterComponent({image}, {tree});
        });

        it('should not apply delayed test result, if no screens were accepted', () => {
            ScreenshotAccepterHeader.firstCall.args[0].onClose();

            assert.notCalled(actionsStub.applyDelayedTestResults);
        });

        it('should apply delayed test result, if some screens were accepted', async () => {
            await ScreenshotAccepterHeader.firstCall.args[0].onScreenshotAccept('img-1');

            ScreenshotAccepterHeader.firstCall.args[0].onClose();

            assert.calledOnce(actionsStub.applyDelayedTestResults);
        });

        it('should not apply delayed test result, if it is cancelled by "Undo"', async () => {
            await ScreenshotAccepterHeader.firstCall.args[0].onScreenshotAccept('img-1');
            await ScreenshotAccepterHeader.firstCall.args[0].onScreenshotUndo();

            ScreenshotAccepterHeader.firstCall.args[0].onClose();

            assert.notCalled(actionsStub.applyDelayedTestResults);
        });
    });

    describe('should preload images', () => {
        const mkImgPath_ = (label, imageId) => `${label}-${imageId}`;
        const mkBrowserId_ = (fullName, browserName) => `${fullName} ${browserName}`;
        const mkStateName_ = (browserId, stateName) => `${browserId} ${stateName}`;
        const mkImgId_ = (browserId, retry, state) => `${browserId} ${retry} ${state}`;
        const mkImg_ = (label, imageId) => ({path: mkImgPath_(label, imageId)});

        const mkImgs_ = (id) => ({
            id,
            actualImg: mkImg_('actual', id),
            expectedImg: mkImg_('expected', id),
            diffImg: mkImg_('diff', id)
        });

        const eachLabel_ = (cb) => ['expected', 'actual', 'diff'].forEach(cb);

        beforeEach(() => {
            const browserIds = Array(10).fill(0).map((_, ind) => mkBrowserId_(`test-${ind + 1}`, 'bro-1'));
            const image = mkImage({id: 'img-2', parentId: 'res-1', stateName: 'plain'});
            const resultsById = mkResult({id: 'res-1', parentId: mkBrowserId_('test-2', 'bro-1'), imageIds: ['img-2']});
            const tree = mkStateTree({resultsById});
            selectors.getAcceptableImagesByStateName.returns(browserIds.reduce((acc, browserId) => {
                const stateName = mkStateName_(browserId, 'plain');
                const images = [1, 2].map(retry => mkImgs_(mkImgId_(browserId, retry, 'plain')));

                acc[stateName] = images;

                return acc;
            }, {}));

            mkScreenshotAccepterComponent({image}, {tree});
        });

        it('from adjacent screens', () => {
            [9, 10, 1, 3, 4, 5].forEach(ind => {
                eachLabel_(label => {
                    const browserId = mkBrowserId_(`test-${ind}`, 'bro-1');
                    const imageId = mkImgId_(browserId, 2, 'plain');
                    const imagePath = mkImgPath_(label, imageId);

                    assert.calledWith(preloadImageStub, imagePath);
                });
            });
        });

        it('only from last retry', () => {
            eachLabel_(label => {
                const browserId = mkBrowserId_(`test-${3}`, 'bro-1');
                const firstImageId = mkImgId_(browserId, 1, 'plain');
                const secondImageId = mkImgId_(browserId, 2, 'plain');

                assert.neverCalledWith(preloadImageStub, mkImgPath_(label, firstImageId));
                assert.calledWith(preloadImageStub, mkImgPath_(label, secondImageId));
            });
        });

        it('on active image change', () => {
            const browserId = mkBrowserId_('test-6', 'bro-1');
            const imageId = mkImgId_(browserId, 2, 'plain');

            eachLabel_(label => assert.neverCalledWith(preloadImageStub, mkImgPath_(label, imageId)));

            ScreenshotAccepterHeader.firstCall.args[0].onActiveImageChange(2);

            eachLabel_(label => assert.calledWith(preloadImageStub, mkImgPath_(label, imageId)));
        });

        it('on image accept', async () => {
            const preloadingBrowserId = mkBrowserId_('test-6', 'bro-1');
            const preloadingImageId = mkImgId_(preloadingBrowserId, 2, 'plain');
            const acceptingBrowserId = mkBrowserId_('test-2', 'bro-1');
            const acceptingImageId = mkImgId_(acceptingBrowserId, 2, 'plain');

            eachLabel_(label => assert.neverCalledWith(preloadImageStub, mkImgPath_(label, preloadingImageId)));

            await ScreenshotAccepterHeader.firstCall.args[0].onScreenshotAccept(acceptingImageId);

            eachLabel_(label => assert.calledWith(preloadImageStub, mkImgPath_(label, preloadingImageId)));
        });
    });
});
