import React from 'react';
import proxyquire from 'proxyquire';
import { mkConnectedComponent, mkTestResult_ } from '../utils';
describe('<State/>', function () {
    var sandbox = sinon.sandbox.create();
    var State;
    var utilsStub;
    beforeEach(function () {
        utilsStub = { isAcceptable: sandbox.stub() };
        State = proxyquire('lib/static/components/state', {
            '../../modules/utils': utilsStub
        }).default;
    });
    it('should render accept button if "gui" is running', function () {
        var stateComponent = mkConnectedComponent(React.createElement(State, { state: mkTestResult_(), acceptHandler: function () { } }), { initialState: { gui: true } });
        assert.equal(stateComponent.find('.button_type_suite-controls').first().text(), '✔ Accept');
    });
    it('should not render accept button if "gui" is not running', function () {
        var stateComponent = mkConnectedComponent(React.createElement(State, { state: mkTestResult_(), gui: false, acceptHandler: function () { } }), { initialState: { gui: false } });
        assert.lengthOf(stateComponent.find('.button_type_suite-controls'), 0);
    });
    describe('"Accept" button', function () {
        it('should be disabled if test result is not acceptable', function () {
            var testResult = mkTestResult_({ status: 'idle' });
            utilsStub.isAcceptable.withArgs(testResult).returns(false);
            var stateComponent = mkConnectedComponent(React.createElement(State, { state: testResult, acceptHandler: function () { } }), { initialState: { gui: true } });
            assert.isTrue(stateComponent.find('[label="✔ Accept"]').prop('isDisabled'));
        });
        it('should be enabled if test result is acceptable', function () {
            var testResult = mkTestResult_();
            utilsStub.isAcceptable.withArgs(testResult).returns(true);
            var stateComponent = mkConnectedComponent(React.createElement(State, { state: testResult, acceptHandler: function () { } }), { initialState: { gui: true } });
            assert.isFalse(stateComponent.find('[label="✔ Accept"]').prop('isDisabled'));
        });
        it('should run accept handler on click', function () {
            var testResult = mkTestResult_({ name: 'bro' });
            var acceptHandler = sinon.stub();
            utilsStub.isAcceptable.withArgs(testResult).returns(true);
            var stateComponent = mkConnectedComponent(React.createElement(State, { state: testResult, acceptHandler: acceptHandler }), { initialState: { gui: true } });
            stateComponent.find('[label="✔ Accept"]').simulate('click');
            assert.calledOnce(acceptHandler);
        });
    });
    describe('scaleImages', function () {
        it('should not scale images by default', function () {
            var testResult = mkTestResult_();
            var stateComponent = mkConnectedComponent(React.createElement(State, { state: testResult, acceptHandler: function () { } }));
            var imageContainer = stateComponent.find('.image-box__container');
            assert.isFalse(imageContainer.hasClass('image-box__container_scale'));
        });
        it('should scale images if "scaleImages" option is enabled', function () {
            var testResult = mkTestResult_();
            var stateComponent = mkConnectedComponent(React.createElement(State, { state: testResult, acceptHandler: function () { } }), { initialState: { view: { scaleImages: true } } });
            var imageContainer = stateComponent.find('.image-box__container');
            assert.isTrue(imageContainer.hasClass('image-box__container_scale'));
        });
    });
    describe('lazyLoad', function () {
        it('should load images lazy if lazy load offset is specified', function () {
            var stateComponent = mkConnectedComponent(React.createElement(State, { state: mkTestResult_({ status: 'success' }), acceptHandler: function () { } }), { initialState: { view: { lazyLoadOffset: 800 } } });
            var lazyLoadContainer = stateComponent.find('.LazyLoad');
            assert.lengthOf(lazyLoadContainer, 1);
        });
        it('should not load images lazy if lazy load offset is 0', function () {
            var stateComponent = mkConnectedComponent(React.createElement(State, { state: mkTestResult_({ status: 'success' }), acceptHandler: function () { } }), { initialState: { view: { lazyLoadOffset: 0 } } });
            var lazyLoadContainer = stateComponent.find('.LazyLoad');
            assert.lengthOf(lazyLoadContainer, 0);
        });
        it('should not load images lazy of lazy load offset is not specified', function () {
            var stateComponent = mkConnectedComponent(React.createElement(State, { state: mkTestResult_({ status: 'success' }), acceptHandler: function () { } }));
            var lazyLoadContainer = stateComponent.find('.LazyLoad');
            assert.lengthOf(lazyLoadContainer, 0);
        });
    });
});
//# sourceMappingURL=state.js.map