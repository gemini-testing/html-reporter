import React from 'react';
import proxyquire from 'proxyquire';
import {mkConnectedComponent} from '../utils';

describe('<GuiControls />', () => {
    const sandbox = sinon.sandbox.create();

    let GuiControls, RunButton, AcceptOpenedButton, CommonControls, CommonFilters, actionsStub, selectors;

    beforeEach(() => {
        RunButton = sandbox.stub().returns(null);
        AcceptOpenedButton = sandbox.stub().returns(null);
        CommonControls = sandbox.stub().returns(null);
        CommonFilters = sandbox.stub().returns(null);
        actionsStub = {
            runAllTests: sandbox.stub().returns({type: 'some-type'}),
            runFailedTests: sandbox.stub().returns({type: 'some-type'}),
            stopTests: sandbox.stub().returns({type: 'some-type'}),
            stopServer: sandbox.stub().returns({type: 'some-type'})
        };
        selectors = {
            getFailedTests: sandbox.stub().returns([]),
            getCheckedTests: sandbox.stub().returns([])
        };

        GuiControls = proxyquire('lib/static/components/controls/gui-controls', {
            './run-button': {default: RunButton},
            './accept-opened-button': {default: AcceptOpenedButton},
            './common-controls': {default: CommonControls},
            './common-filters': {default: CommonFilters},
            '../../modules/actions': actionsStub,
            '../../../modules/selectors/tree': selectors
        }).default;
    });

    afterEach(() => sandbox.restore());

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

    describe('"Stop server" button', () => {
        it('should be disabled when server is already stopped', () => {
            const component = mkConnectedComponent(<GuiControls />, {
                initialState: {serverStopped: true}
            });

            assert.isTrue(component.find('[label="Stop server"]').prop('isDisabled'));
        });

        it('should call "stopServer" action on click', () => {
            const component = mkConnectedComponent(<GuiControls />);

            component.find('[label="Stop server"]').simulate('click');

            assert.calledOnceWith(actionsStub.stopServer);
        });

        it('should work when tests are running', () => {
            const component = mkConnectedComponent(<GuiControls />, {
                initialState: {running: true, processing: true}
            });

            const stop = component.find('[label="Stop server"]');
            assert.isFalse(stop.prop('isDisabled'));

            stop.simulate('click');
            assert.calledOnceWith(actionsStub.stopServer);
        });
    });
});
