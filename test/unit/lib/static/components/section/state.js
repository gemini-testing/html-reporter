import React from 'react';
import proxyquire from 'proxyquire';
import {defaults, defaultsDeep} from 'lodash';
import {SUCCESS, FAIL, ERROR, UPDATED, IDLE} from 'lib/constants/test-statuses';
import {mkConnectedComponent, mkTestResult_, mkImg_} from '../utils';

describe('<State/>', () => {
    const sandbox = sinon.sandbox.create();

    let State;
    let utilsStub;

    const mkToggleHandler = (testResult) => {
        return sandbox.stub().callsFake(({opened}) => {
            testResult.opened = opened;
        });
    };

    const mkStateComponent = (stateProps = {}, initialState = {}) => {
        const state = stateProps.state || mkTestResult_();

        stateProps = defaults(stateProps, {
            state,
            acceptHandler: () => {},
            findSameDiffsHandler: () => {},
            toggleHandler: () => {}
        });

        initialState = defaultsDeep(initialState, {
            gui: true,
            view: {expand: 'all', scaleImages: false, showOnlyDiff: false, lazyLoadOffset: 0}
        });

        return mkConnectedComponent(
            <State {...stateProps} />,
            {initialState}
        );
    };

    beforeEach(() => {
        utilsStub = {isAcceptable: sandbox.stub()};

        State = proxyquire('lib/static/components/state', {
            '../../modules/utils': utilsStub
        }).default;
    });

    afterEach(() => sandbox.restore());

    [
        {name: 'accept', text: '✔ Accept'},
        {name: 'find same diffs', text: '🔍 Find same diffs'}
    ].forEach(({name, text}, ind) => {
        it(`should render ${name} button if "gui" is running`, () => {
            const stateComponent = mkStateComponent({}, {gui: true});

            assert.equal(stateComponent.find('.button_type_suite-controls').at(ind).text(), text);
        });

        it(`should not render ${name} button if "gui" is not running`, () => {
            const stateComponent = mkStateComponent({}, {gui: false});

            assert.lengthOf(stateComponent.find('.button_type_suite-controls'), 0);
        });
    });

    describe('"Accept" button', () => {
        it('should be disabled if test result is not acceptable', () => {
            const testResult = mkTestResult_({status: IDLE});
            utilsStub.isAcceptable.withArgs(testResult).returns(false);

            const stateComponent = mkStateComponent({state: testResult});

            assert.isTrue(stateComponent.find('[label="✔ Accept"]').prop('isDisabled'));
        });

        it('should be enabled if test result is acceptable', () => {
            const testResult = mkTestResult_();
            utilsStub.isAcceptable.withArgs(testResult).returns(true);

            const stateComponent = mkStateComponent({state: testResult});

            assert.isFalse(stateComponent.find('[label="✔ Accept"]').prop('isDisabled'));
        });

        it('should call accept handler on click', () => {
            const testResult = mkTestResult_({name: 'bro'});
            const acceptHandler = sinon.stub();

            utilsStub.isAcceptable.withArgs(testResult).returns(true);

            const stateComponent = mkStateComponent({state: testResult, acceptHandler});

            stateComponent.find('[label="✔ Accept"]').simulate('click');

            assert.calledOnce(acceptHandler);
        });
    });

    describe('"Find same diffs" button', () => {
        it('should be disabled if test result is errored', () => {
            const testResult = mkTestResult_({status: ERROR});

            const stateComponent = mkStateComponent({state: testResult, error: {}});

            assert.isTrue(stateComponent.find('[label="🔍 Find same diffs"]').prop('isDisabled'));
        });

        it('should be disabled if test result is success', () => {
            const testResult = mkTestResult_({status: SUCCESS});

            const stateComponent = mkStateComponent({state: testResult});

            assert.isTrue(stateComponent.find('[label="🔍 Find same diffs"]').prop('isDisabled'));
        });

        it('should be enabled if test result is failed', () => {
            const testResult = mkTestResult_({status: FAIL, actualImg: mkImg_(), diffImg: mkImg_()});

            const stateComponent = mkStateComponent({state: testResult});

            assert.isFalse(stateComponent.find('[label="🔍 Find same diffs"]').prop('isDisabled'));
        });

        it('should call find same diffs handler on click', () => {
            const testResult = mkTestResult_({status: FAIL, actualImg: mkImg_(), diffImg: mkImg_()});
            const findSameDiffsHandler = sinon.stub();

            const stateComponent = mkStateComponent({state: testResult, findSameDiffsHandler});

            stateComponent.find('[label="🔍 Find same diffs"]').simulate('click');

            assert.calledOnce(findSameDiffsHandler);
        });
    });

    describe('scaleImages', () => {
        it('should not scale images by default', () => {
            const stateComponent = mkStateComponent();
            const imageContainer = stateComponent.find('.image-box__container');

            assert.isFalse(imageContainer.hasClass('image-box__container_scale'));
        });

        it('should scale images if "scaleImages" option is enabled', () => {
            const stateComponent = mkStateComponent({}, {view: {scaleImages: true}});
            const imageContainer = stateComponent.find('.image-box__container');

            assert.isTrue(imageContainer.hasClass('image-box__container_scale'));
        });
    });

    describe('lazyLoad', () => {
        it('should load images lazy if "lazyLoadOffset" is specified', () => {
            const testResult = mkTestResult_({status: SUCCESS});
            const stateComponent = mkStateComponent({state: testResult}, {view: {lazyLoadOffset: 800}});
            const lazyLoadContainer = stateComponent.find('LazyLoad');

            assert.lengthOf(lazyLoadContainer, 1);
        });

        describe('should not load images lazy', () => {
            it('if passed image contain "size" but "lazyLoadOffset" does not set', () => {
                const expectedImg = mkImg_({size: {width: 200, height: 100}});
                const testResult = mkTestResult_({status: SUCCESS, expectedImg});

                const stateComponent = mkStateComponent({state: testResult});
                const lazyLoadContainer = stateComponent.find('LazyLoad');

                assert.lengthOf(lazyLoadContainer, 0);
            });

            describe('if passed image does not contain "size" and "lazyLoadOffset" is', () => {
                it('set to 0', () => {
                    const testResult = mkTestResult_({status: SUCCESS, expectedImg: {path: 'some/path'}});

                    const stateComponent = mkStateComponent({state: testResult}, {view: {lazyLoadOffset: 0}});
                    const lazyLoadContainer = stateComponent.find('LazyLoad');

                    assert.lengthOf(lazyLoadContainer, 0);
                });

                it('not specified', () => {
                    const testResult = mkTestResult_({status: SUCCESS, expectedImg: {path: 'some/path'}});

                    const stateComponent = mkStateComponent({state: testResult});
                    const lazyLoadContainer = stateComponent.find('LazyLoad');

                    assert.lengthOf(lazyLoadContainer, 0);
                });
            });
        });

        describe('should render placeholder with', () => {
            it('"width" prop equal to passed image width', () => {
                const expectedImg = mkImg_({size: {width: 200}});
                const testResult = mkTestResult_({status: SUCCESS, expectedImg});

                const stateComponent = mkStateComponent({state: testResult}, {view: {lazyLoadOffset: 10}});

                assert.equal(stateComponent.find('Placeholder').prop('width'), 200);
            });

            it('"paddingTop" prop calculated depending on width and height of the image', () => {
                const expectedImg = mkImg_({size: {width: 200, height: 100}});
                const testResult = mkTestResult_({status: SUCCESS, expectedImg});

                const stateComponent = mkStateComponent({state: testResult}, {view: {lazyLoadOffset: 10}});

                assert.equal(stateComponent.find('Placeholder').prop('paddingTop'), '50.00%');
            });
        });
    });

    describe('should show opened state if', () => {
        ['errors', 'retries'].forEach((expand) => {
            it(`"${expand}" expanded and test failed`, () => {
                const testResult = mkTestResult_({
                    status: FAIL, stateName: 'plain', actualImg: mkImg_(), diffImg: mkImg_()
                });
                const toggleHandler = mkToggleHandler(testResult);

                const stateComponent = mkStateComponent({state: testResult, toggleHandler}, {view: {expand}});

                assert.lengthOf(stateComponent.find('.image-box__container'), 1);
            });

            it(`"${expand}" expanded and test errored`, () => {
                const testResult = mkTestResult_({status: ERROR, stateName: 'plain'});
                const toggleHandler = mkToggleHandler(testResult);

                const stateComponent = mkStateComponent({state: testResult, toggleHandler, error: {}}, {view: {expand}});

                assert.lengthOf(stateComponent.find('.image-box__container'), 1);
            });
        });

        it('"all" expanded and test success', () => {
            const testResult = mkTestResult_({status: SUCCESS, stateName: 'plain'});
            const toggleHandler = mkToggleHandler(testResult);

            const stateComponent = mkStateComponent({state: testResult, toggleHandler}, {view: {expand: 'all'}});

            assert.lengthOf(stateComponent.find('.image-box__container'), 1);
        });

        it('stateName is not specified', () => {
            const testResult = mkTestResult_({status: SUCCESS});

            const stateComponent = mkStateComponent({state: testResult}, {view: {expand: 'errors'}});

            assert.lengthOf(stateComponent.find('.image-box__container'), 1);
        });
    });

    describe('should not show opened state if', () => {
        ['errors', 'retries'].forEach((expand) => {
            it(`"${expand}" expanded and test success`, () => {
                const testResult = mkTestResult_({status: SUCCESS, stateName: 'plain'});

                const stateComponent = mkStateComponent({state: testResult}, {view: {expand}});

                assert.lengthOf(stateComponent.find('.image-box__container'), 0);
            });

            it(`"${expand}" expanded and test updated`, () => {
                const testResult = mkTestResult_({status: UPDATED, stateName: 'plain'});

                const stateComponent = mkStateComponent({state: testResult}, {view: {expand}});

                assert.lengthOf(stateComponent.find('.image-box__container'), 0);
            });
        });
    });

    it('should open closed state by click on it', () => {
        const testResult = mkTestResult_({status: SUCCESS, stateName: 'plain'});
        const toggleHandler = mkToggleHandler(testResult);

        const stateComponent = mkStateComponent({state: testResult, toggleHandler}, {view: {expand: 'errors'}});
        stateComponent.find('.state-title').simulate('click');

        assert.lengthOf(stateComponent.find('.image-box__container'), 1);
    });

    describe('"toggleHandler" handler', () => {
        it('should call on mount', () => {
            const testResult = mkTestResult_({stateName: 'plain'});
            const toggleHandler = mkToggleHandler(testResult);

            mkStateComponent({state: testResult, toggleHandler});

            assert.calledOnceWith(toggleHandler, {stateName: 'plain', opened: true});
        });

        it('should call on click in state name', () => {
            const testResult = mkTestResult_({stateName: 'plain'});
            const toggleHandler = mkToggleHandler(testResult);

            const stateComponent = mkStateComponent({state: testResult, toggleHandler});
            stateComponent.find('.state-title').simulate('click');

            assert.calledTwice(toggleHandler);
            assert.calledWith(toggleHandler.firstCall, {stateName: 'plain', opened: true});
            assert.calledWith(toggleHandler.secondCall, {stateName: 'plain', opened: false});
        });
    });
});
