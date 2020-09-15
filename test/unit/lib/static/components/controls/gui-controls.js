import React from 'react';
import RunButton from 'lib/static/components/controls/run-button';
import AcceptOpenedButton from 'lib/static/components/controls/accept-opened-button';
import proxyquire from 'proxyquire';
import {mkState, mkConnectedComponent} from '../utils';

describe('<GuiControls />', () => {
    const sandbox = sinon.sandbox.create();

    let GuiControls, actionsStub, selectors;

    beforeEach(() => {
        actionsStub = {
            runAllTests: sandbox.stub().returns({type: 'some-type'}),
            runFailedTests: sandbox.stub().returns({type: 'some-type'})
        };

        selectors = {
            getFailedTests: sandbox.stub().returns([])
        };

        GuiControls = proxyquire('lib/static/components/controls/gui-controls', {
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
        });

        it('should call "runAllTests" action on click', () => {
            const component = mkConnectedComponent(<GuiControls />, {
                initialState: {tree: {suites: {allRootIds: ['suite']}}, processing: false}
            });

            component.find(RunButton).simulate('click');

            assert.calledOnceWith(actionsStub.runAllTests);
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
            const component = mkConnectedComponent(<GuiControls />);

            assert.isTrue(component.exists(AcceptOpenedButton));
        });
    });
});
