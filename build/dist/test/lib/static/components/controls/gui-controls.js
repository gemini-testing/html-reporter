import React from 'react';
import RunButton from 'lib/static/components/controls/run-button';
import proxyquire from 'proxyquire';
import { mkConnectedComponent } from '../utils';
describe('<ControlButtons />', function () {
    var sandbox = sinon.sandbox.create();
    var ControlButtons;
    var actionsStub;
    beforeEach(function () {
        actionsStub = {
            runAllTests: sandbox.stub().returns({ type: 'some-type' }),
            runFailedTests: sandbox.stub().returns({ type: 'some-type' }),
            acceptAll: sandbox.stub().returns({ type: 'some-type' })
        };
        ControlButtons = proxyquire('lib/static/components/controls/gui-controls', {
            '../../modules/actions': actionsStub
        }).default;
    });
    afterEach(function () { return sandbox.restore(); });
    describe('"Run" button', function () {
        it('should be disabled if no suites to run', function () {
            var component = mkConnectedComponent(React.createElement(ControlButtons, null), {
                initialState: { suiteIds: { all: [] }, running: false }
            });
            assert.isTrue(component.find(RunButton).prop('isDisabled'));
        });
        it('should be enabled if suites exist to run', function () {
            var component = mkConnectedComponent(React.createElement(ControlButtons, null), {
                initialState: { suiteIds: { all: ['some-suite'] }, running: false }
            });
            assert.isFalse(component.find(RunButton).prop('isDisabled'));
        });
        it('should be disabled while tests running', function () {
            var component = mkConnectedComponent(React.createElement(ControlButtons, null), {
                initialState: { suiteIds: { all: ['some-suite'] }, running: true }
            });
            assert.isTrue(component.find(RunButton).prop('isDisabled'));
        });
        it('should pass "autoRun" prop', function () {
            var component = mkConnectedComponent(React.createElement(ControlButtons, null), {
                initialState: { autoRun: true }
            });
            assert.isTrue(component.find(RunButton).prop('autoRun'));
        });
        it('should call "runAllTests" action on click', function () {
            var component = mkConnectedComponent(React.createElement(ControlButtons, null), {
                initialState: { suiteIds: { all: ['some-suite'] }, running: false }
            });
            component.find(RunButton).simulate('click');
            assert.calledOnceWith(actionsStub.runAllTests);
        });
    });
    [
        { name: 'Retry failed tests', handler: 'runFailedTests' },
        { name: 'Accept all', handler: 'acceptAll' }
    ].forEach(function (button) {
        describe("\"" + button.name + "\" button", function () {
            it('should be disabled if no failed suites to run', function () {
                var component = mkConnectedComponent(React.createElement(ControlButtons, null), {
                    initialState: { suiteIds: { all: [], failed: [] }, running: false }
                });
                assert.isTrue(component.find("[label=\"" + button.name + "\"]").prop('isDisabled'));
            });
            it('should be enabled if failed suites exist to run', function () {
                var component = mkConnectedComponent(React.createElement(ControlButtons, null), {
                    initialState: {
                        suites: { suite1: {} },
                        suiteIds: { all: [], failed: ['suite1'] },
                        running: false
                    }
                });
                assert.isFalse(component.find("[label=\"" + button.name + "\"]").prop('isDisabled'));
            });
            it('should be disabled while tests running', function () {
                var component = mkConnectedComponent(React.createElement(ControlButtons, null), {
                    initialState: { running: true }
                });
                assert.isTrue(component.find("[label=\"" + button.name + "\"]").prop('isDisabled'));
            });
            it("should call \"" + button.handler + "\" action on click", function () {
                var failedSuite = { name: 'suite1', status: 'fail' };
                var component = mkConnectedComponent(React.createElement(ControlButtons, null), {
                    initialState: {
                        suites: { suite1: failedSuite },
                        suiteIds: { all: [], failed: ['suite1'] },
                        running: false
                    }
                });
                component.find("[label=\"" + button.name + "\"]").simulate('click');
                assert.calledOnceWith(actionsStub[button.handler], [failedSuite]);
            });
        });
    });
});
//# sourceMappingURL=gui-controls.js.map