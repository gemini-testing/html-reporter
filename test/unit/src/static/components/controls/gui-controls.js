import React from 'react';
import RunButton from 'lib/static/components/controls/run-button';
import proxyquire from 'proxyquire';
import {mkState, mkConnectedComponent} from '../utils';

describe('<GuiControls />', () => {
    const sandbox = sinon.sandbox.create();

    let GuiControls, AcceptOpenedButton, CommonControls, actionsStub, selectors;

    beforeEach(() => {
        AcceptOpenedButton = sandbox.stub().returns(null);
        CommonControls = sandbox.stub().returns(null);
        actionsStub = {
            runAllTests: sandbox.stub().returns({type: 'some-type'}),
            runFailedTests: sandbox.stub().returns({type: 'some-type'}),
            stopTests: sandbox.stub().returns({type: 'some-type'})
        };
        selectors = {
            getFailedTests: sandbox.stub().returns([])
        };

        GuiControls = proxyquire('lib/static/components/controls/gui-controls', {
            './accept-opened-button': {default: AcceptOpenedButton},
            './common-controls': {default: CommonControls},
            '../../modules/actions': actionsStub,
            '../../modules/selectors/tree': selectors
        }).default;
    });

    afterEach(() => sandbox.restore());

    describe('"Run" button', () => {
        it('should be disabled if no suites to run', () => {
            const component = mkConnectedComponent(<GuiControls />, {
                initialState: {tree: {suites: {allRootIds: []}}, processing: false}
            });

            assert.isTrue(component.find(RunButton).prop('isDisabled'));
        });

        it('should be enabled if suites exist to run', () => {
            const component = mkConnectedComponent(<GuiControls />, {
                initialState: {tree: {suites: {allRootIds: ['suite']}}, processing: false}
            });

            assert.isFalse(component.find(RunButton).prop('isDisabled'));
        });

        it('should be disabled while processing something', () => {
            const component = mkConnectedComponent(<GuiControls />, {
                initialState: {tree: {suites: {allRootIds: ['suite']}}, processing: true}
            });

            assert.isTrue(component.find(RunButton).prop('isDisabled'));
        });

        it('should pass "autoRun" prop', () => {
            const component = mkConnectedComponent(<GuiControls />, {
                initialState: {autoRun: true}
            });

            assert.isTrue(component.find(RunButton).prop('autoRun'));
            assert.calledOnce(actionsStub.runAllTests);
        });

        it('should call "runAllTests" action on click', () => {
            const component = mkConnectedComponent(<GuiControls />, {
                initialState: {tree: {suites: {allRootIds: ['suite']}}, processing: false}
            });

            component.find(RunButton).simulate('click');

            assert.calledOnce(actionsStub.runAllTests);
        });
    });

    describe('"Retry failed tests" button', () => {
        it('should be disabled if no failed suites to run', () => {
            const component = mkConnectedComponent(<GuiControls />, {
                initialState: {tree: {suites: {failedRootIds: []}}, processing: false}
            });

            assert.isTrue(component.find('[label="Retry failed tests"]').prop('isDisabled'));
        });

        it('should be enabled if failed suites exist to run', () => {
            const component = mkConnectedComponent(<GuiControls />, {
                initialState: {tree: {suites: {failedRootIds: ['suite']}}, processing: false}
            });

            assert.isFalse(component.find('[label="Retry failed tests"]').prop('isDisabled'));
        });

        it('should be disabled while processing something', () => {
            const component = mkConnectedComponent(<GuiControls />, {
                initialState: {tree: {suites: {failedRootIds: ['suite']}}, processing: true}
            });

            assert.isTrue(component.find('[label="Retry failed tests"]').prop('isDisabled'));
        });

        it('should call "runFailedTests" action on click', () => {
            const failedTests = [{testName: 'suite test', browserName: 'yabro'}];
            const state = mkState({initialState: {tree: {suites: {failedRootIds: ['suite']}}, processing: false}});
            selectors.getFailedTests.withArgs(state).returns(failedTests);
            const component = mkConnectedComponent(<GuiControls />, {state});

            component.find('[label="Retry failed tests"]').simulate('click');

            assert.calledOnceWith(actionsStub.runFailedTests, failedTests);
        });
    });

    describe('"Accept opened" button', () => {
        it('should render button', () => {
            mkConnectedComponent(<GuiControls />);

            assert.calledOnce(AcceptOpenedButton);
        });
    });

    describe('"Stop tests" button', () => {
        it('should be disabled when tests are not running', () => {
            const component = mkConnectedComponent(<GuiControls />, {
                initialState: {running: false, stopping: false}
            });

            const stop = component.find('[label="Stop tests"]');
            assert.isTrue(stop.prop('isDisabled'));
        });

        describe ('should be disabled when tests are', () => {
            it('running', () => {
                const component = mkConnectedComponent(<GuiControls />, {
                    initialState: {running: true, stopping: false}
                });

                const stop = component.find('[label="Stop tests"]');
                assert.isFalse(stop.prop('isDisabled'));
            });

            it('stopping', () => {
                const component = mkConnectedComponent(<GuiControls />, {
                    initialState: {running: true, stopping: true}
                });

                const stop = component.find('[label="Stop tests"]');
                assert.isTrue(stop.prop('isDisabled'));
            });
        });

        it('should call "stopTests" action on click', () => {
            const component = mkConnectedComponent(<GuiControls />, {
                initialState: {running: true}
            });

            component.find('[label="Stop tests"]').simulate('click');
            assert.calledOnce(actionsStub.stopTests);
        });
    });
});
