import React from 'react';
import ReactDOM from 'react-dom';
import {defaults} from 'lodash';
import proxyquire from 'proxyquire';
import {EXPAND_ALL} from 'lib/constants/expand-modes';
import {mkConnectedComponent} from '../../utils';

describe('<ScreenshotAccepter/>', () => {
    const sandbox = sinon.sandbox.create();
    let ScreenshotAccepter, ScreenshotAccepterHeader, ScreenshotAccepterBody, actions, selectors, parentNode;

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
        props = defaults(props, {
            image: mkImage(),
            onClose: sinon.stub()
        });
        initialState = defaults(initialState, {
            tree: mkStateTree(),
            view: {expand: EXPAND_ALL}
        });

        return mkConnectedComponent(<ScreenshotAccepter {...props} />, {initialState});
    };

    beforeEach(() => {
        actions = {
            acceptTest: sandbox.stub().returns({type: 'some-type'})
        };

        selectors = {
            getAcceptableImagesByStateName: sandbox.stub().returns({})
        };

        parentNode = {
            scrollTo: sinon.stub()
        };

        ScreenshotAccepterHeader = sinon.stub().returns(null);
        ScreenshotAccepterBody = sinon.stub().returns(null);

        sandbox.stub(ReactDOM, 'findDOMNode').returns({parentNode});

        ScreenshotAccepter = proxyquire('lib/static/components/modals/screenshot-accepter', {
            './header': {default: ScreenshotAccepterHeader},
            './body': {default: ScreenshotAccepterBody},
            '../../../modules/actions': actions,
            '../../../modules/selectors/tree': selectors
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

            assert.calledOnceWith(
                ScreenshotAccepterHeader,
                {
                    images: [image],
                    stateNameImageIds: ['bro-1 plain'],
                    retryIndex: 0,
                    activeImageIndex: 0,
                    onClose: sinon.match.func,
                    onRetryChange: sinon.match.func,
                    onActiveImageChange: sinon.match.func,
                    onScreenshotAccept: sinon.match.func
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
            it('should "acceptTest" action', () => {
                const image = mkImage({id: 'img-1', parentId: 'res-1', stateName: 'plain'});
                const resultsById = mkResult({id: 'res-1', parentId: 'bro-1', imageIds: ['img-1']});
                const tree = mkStateTree({resultsById});
                selectors.getAcceptableImagesByStateName.returns({'bro-1 plain': [image]});

                mkScreenshotAccepterComponent({image}, {tree});
                ScreenshotAccepterHeader.firstCall.args[0].onScreenshotAccept('img-1');

                assert.calledOnceWith(actions.acceptTest, 'img-1');
            });
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
});
