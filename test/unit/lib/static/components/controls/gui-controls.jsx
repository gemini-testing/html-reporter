import React from 'react';
import proxyquire from 'proxyquire';
import {mkConnectedComponent} from '../utils';
import userEvent from '@testing-library/user-event';

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
            stopTests: sandbox.stub().returns({type: 'some-type'})
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

            const stop = component.getByText((_, el) => el.textContent === 'Stop tests', {selector: 'button'});
            assert.isTrue(stop.disabled);
        });

        describe ('should be disabled when tests are', () => {
            it('running', () => {
                const component = mkConnectedComponent(<GuiControls />, {
                    initialState: {running: true, stopping: false}
                });

                const stop = component.getByText((_, el) => el.textContent === 'Stop tests', {selector: 'button'});
                assert.isFalse(stop.disabled);
            });

            it('stopping', () => {
                const component = mkConnectedComponent(<GuiControls />, {
                    initialState: {running: true, stopping: true}
                });

                const stop = component.getByText((_, el) => el.textContent === 'Stop tests', {selector: 'button'});
                assert.isTrue(stop.disabled);
            });
        });

        it('should call "stopTests" action on click', async () => {
            const user = userEvent.setup();
            const component = mkConnectedComponent(<GuiControls />, {
                initialState: {running: true}
            });
            const stop = component.getByText((_, el) => el.textContent === 'Stop tests', {selector: 'button'});

            await user.click(stop);

            assert.calledOnce(actionsStub.stopTests);
        });
    });
});
