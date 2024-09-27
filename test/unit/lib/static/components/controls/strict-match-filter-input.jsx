import React from 'react';
import {mkConnectedComponent} from '../../utils';
import proxyquire from 'proxyquire';
import userEvent from '@testing-library/user-event';

describe('<StrictMatchFilterInput />', () => {
    const sandbox = sinon.sandbox.create();

    let StrictMatchFilterInput;
    let actionsStub;

    beforeEach(() => {
        actionsStub = {
            setStrictMatchFilter: sandbox.stub().returns({type: 'some-type'})
        };

        StrictMatchFilterInput = proxyquire('lib/static/components/controls/strict-match-filter-input', {
            '../../modules/actions': actionsStub
        }).default;
    });

    afterEach(() => sandbox.restore());

    it('should set checkbox to checked when prop is set to true', () => {
        const component = mkConnectedComponent(<StrictMatchFilterInput strictMatchFilter={true} />, {
            initialState: {view: {strictMatchFilter: true}}
        });

        assert.isTrue(component.getByRole('switch').checked);
    });

    it('should set checkbox to unchecked when prop is set to false', () => {
        const component = mkConnectedComponent(<StrictMatchFilterInput strictMatchFilter={false} />, {
            initialState: {view: {strictMatchFilter: false}}
        });

        assert.isFalse(component.getByRole('switch').checked);
    });

    it('should call initiate setStrictMatchFilter action with false', async () => {
        const user = userEvent.setup();
        const component = mkConnectedComponent(<StrictMatchFilterInput strictMatchFilter={false} />, {
            initialState: {view: {strictMatchFilter: false}}
        });

        await user.click(component.getByRole('switch'));

        assert.calledOnceWith(actionsStub.setStrictMatchFilter, true);
    });

    it('should call initiate setStrictMatchFilter action with true', async () => {
        const user = userEvent.setup();
        const component = mkConnectedComponent(<StrictMatchFilterInput strictMatchFilter={true} />, {
            initialState: {view: {strictMatchFilter: true}}
        });

        await user.click(component.getByRole('switch'));

        assert.calledOnceWith(actionsStub.setStrictMatchFilter, false);
    });
});
