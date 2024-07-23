import React from 'react';
import {mkConnectedComponent} from '../utils';
import proxyquire from 'proxyquire';

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

        assert.isTrue(component.find('input[type="checkbox"]').prop('checked'));
    });

    it('should set checkbox to unchecked when prop is set to false', () => {
        const component = mkConnectedComponent(<StrictMatchFilterInput strictMatchFilter={false} />, {
            initialState: {view: {strictMatchFilter: false}}
        });

        assert.isFalse(component.find('input[type="checkbox"]').prop('checked'));
    });

    it('should call initiate setStrictMatchFilter action with false', () => {
        const component = mkConnectedComponent(<StrictMatchFilterInput strictMatchFilter={false} />, {
            initialState: {view: {strictMatchFilter: false}}
        });

        component.find('input[type="checkbox"]').simulate('change');

        assert.calledOnceWith(actionsStub.setStrictMatchFilter, true);
    });

    it('should call initiate setStrictMatchFilter action with true', () => {
        const component = mkConnectedComponent(<StrictMatchFilterInput strictMatchFilter={true} />, {
            initialState: {view: {strictMatchFilter: true}}
        });

        component.find('input[type="checkbox"]').simulate('change');

        assert.calledOnceWith(actionsStub.setStrictMatchFilter, false);
    });
});
