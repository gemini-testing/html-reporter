import React from 'react';
import proxyquire from 'proxyquire';
import { mkConnectedComponent, mkTestResult_ } from '../utils';
import { SUCCESS, FAIL, ERROR } from 'lib/constants/test-statuses';
describe('<Body />', function () {
    var sandbox = sinon.sandbox.create();
    var Body;
    var actionsStub;
    var utilsStub;
    beforeEach(function () {
        actionsStub = {
            acceptTest: sandbox.stub().returns({ type: 'some-type' }),
            retryTest: sandbox.stub().returns({ type: 'some-type' })
        };
        utilsStub = { isAcceptable: sandbox.stub() };
        var State = proxyquire('lib/static/components/state', {
            '../../modules/utils': utilsStub
        });
        Body = proxyquire('lib/static/components/section/body', {
            '../../../modules/actions': actionsStub,
            '../../state': State
        }).default;
    });
    afterEach(function () { return sandbox.restore(); });
    it('should render retry button if "gui" is running', function () {
        var bodyComponent = React.createElement(Body, { result: mkTestResult_() });
        var component = mkConnectedComponent(bodyComponent, { initialState: { gui: true } });
        assert.equal(component.find('.button_type_suite-controls').first().text(), '↻ Retry');
    });
    it('should not render retry button if "gui" is not running', function () {
        var bodyComponent = React.createElement(Body, { result: mkTestResult_() });
        var component = mkConnectedComponent(bodyComponent, { initialState: { gui: false } });
        assert.lengthOf(component.find('.button_type_suite-controls'), 0);
    });
    it('should call "acceptTest" action on Accept button click', function () {
        var retries = [];
        var imagesInfo = [{ status: ERROR, actualPath: 'some/path', reason: {}, image: true }];
        var testResult = mkTestResult_({ name: 'bro', imagesInfo: imagesInfo });
        utilsStub.isAcceptable.withArgs(imagesInfo[0]).returns(true);
        var bodyComponent = React.createElement(Body, { result: testResult, suite: { name: 'some-suite' }, retries: retries });
        var component = mkConnectedComponent(bodyComponent);
        component.find('[label="✔ Accept"]').simulate('click');
        assert.calledOnceWith(actionsStub.acceptTest, { name: 'some-suite' }, 'bro', retries.length);
    });
    it('should render state for each state image', function () {
        var imagesInfo = [
            { stateName: 'plain1', status: ERROR, actualPath: 'some/path', reason: {} },
            { stateName: 'plain2', status: ERROR, actualPath: 'some/path', reason: {} }
        ];
        var testResult = mkTestResult_({ name: 'bro', imagesInfo: imagesInfo });
        var component = mkConnectedComponent(React.createElement(Body, { result: testResult, suite: { name: 'some-suite' } }));
        assert.lengthOf(component.find('.tab'), 2);
    });
    it('should not render state if state images does not exist and test passed succesfully', function () {
        var testResult = mkTestResult_({ status: SUCCESS });
        var component = mkConnectedComponent(React.createElement(Body, { result: testResult, suite: { name: 'some-suite' } }));
        assert.lengthOf(component.find('.tab'), 0);
    });
    it('should render additional tab if test errored without screenshot', function () {
        var imagesInfo = [{ stateName: 'plain1', status: SUCCESS, expectedPath: 'some/path' }];
        var testResult = mkTestResult_({ status: ERROR, multipleTabs: true, reason: {}, imagesInfo: imagesInfo });
        var component = mkConnectedComponent(React.createElement(Body, { result: testResult, suite: { name: 'some-suite' } }));
        assert.lengthOf(component.find('.tab'), 2);
    });
    describe('errored additional tab', function () {
        it('should render if test errored without screenshot and tool can use multi tabs', function () {
            var imagesInfo = [{ stateName: 'plain1', status: SUCCESS, expectedPath: 'some/path' }];
            var testResult = mkTestResult_({ status: ERROR, multipleTabs: true, reason: {}, imagesInfo: imagesInfo });
            var component = mkConnectedComponent(React.createElement(Body, { result: testResult, suite: { name: 'some-suite' } }));
            assert.lengthOf(component.find('.tab'), 2);
        });
        it('should not render if tool does not use multi tabs', function () {
            var imagesInfo = [{ stateName: 'plain1', status: SUCCESS, expectedPath: 'some/path' }];
            var testResult = mkTestResult_({ status: ERROR, multipleTabs: false, reason: {}, screenshot: 'some-screen', imagesInfo: imagesInfo });
            var component = mkConnectedComponent(React.createElement(Body, { result: testResult, suite: { name: 'some-suite' } }));
            assert.lengthOf(component.find('.tab'), 1);
        });
        it('should not render if test errored with screenshot', function () {
            var imagesInfo = [{ stateName: 'plain1', status: SUCCESS, expectedPath: 'some/path' }];
            var testResult = mkTestResult_({ status: ERROR, multipleTabs: true, reason: {}, screenshot: 'some-screen', imagesInfo: imagesInfo });
            var component = mkConnectedComponent(React.createElement(Body, { result: testResult, suite: { name: 'some-suite' } }));
            assert.lengthOf(component.find('.tab'), 1);
        });
        [SUCCESS, FAIL].forEach(function (status) {
            it("should not render if test " + status + "ed", function () {
                var imagesInfo = [{ stateName: 'plain1', status: SUCCESS, expectedPath: 'some/path' }];
                var testResult = mkTestResult_({ status: status, multipleTabs: true, reason: {}, imagesInfo: imagesInfo });
                var component = mkConnectedComponent(React.createElement(Body, { result: testResult, suite: { name: 'some-suite' } }));
                assert.lengthOf(component.find('.tab'), 1);
            });
        });
    });
    describe('"Retry" button', function () {
        it('should be disabled while tests running', function () {
            var testResult = mkTestResult_();
            var component = mkConnectedComponent(React.createElement(Body, { result: testResult }), { initialState: { running: true } });
            assert.isTrue(component.find('[label="↻ Retry"]').prop('isDisabled'));
        });
        it('should be enabled if tests are not started yet', function () {
            var testResult = mkTestResult_();
            var component = mkConnectedComponent(React.createElement(Body, { result: testResult }), { initialState: { running: false } });
            assert.isFalse(component.find('[label="↻ Retry"]').prop('isDisabled'));
        });
        it('should call action "retryTest" on "handler" prop calling', function () {
            var bodyComponent = React.createElement(Body, { result: mkTestResult_({ name: 'bro' }), suite: { name: 'some-suite' } });
            var component = mkConnectedComponent(bodyComponent, { initialState: { running: false } });
            component.find('[label="↻ Retry"]').simulate('click');
            assert.calledOnceWith(actionsStub.retryTest, { name: 'some-suite' }, 'bro');
        });
    });
});
//# sourceMappingURL=body.js.map