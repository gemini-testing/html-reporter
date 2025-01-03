import {expect} from 'chai';
import React from 'react';
import proxyquire from 'proxyquire';
import {mkConnectedComponent} from '../../utils';
import userEvent from '@testing-library/user-event';

describe('<CustomGuiControls />', () => {
    const sandbox = sinon.sandbox.create();

    let CustomGuiControls;
    let actionsStub;

    const mkInitialState = (customGui) => ({initialState: {config: {customGui}}});

    beforeEach(() => {
        actionsStub = {
            thunkRunCustomGuiAction: sandbox.stub().returns({type: 'some-type'})
        };

        CustomGuiControls = proxyquire('lib/static/components/controls/custom-gui-controls', {
            '../../modules/actions': actionsStub
        }).default;
    });

    afterEach(() => sandbox.restore());

    it('should display nothing if custom-gui-config is empty', () => {
        const component = mkConnectedComponent(<CustomGuiControls />, mkInitialState({}));

        assert.equal(component.container.innerHTML.length, 0);
    });

    it('should display nothing if control type is not supported', () => {
        const component = mkConnectedComponent(<CustomGuiControls />, mkInitialState({
            'some-section': [
                {type: 'unknown'}
            ]
        }));

        assert.equal(component.container.innerHTML.length, 0);
    });

    it('should display buttons from custom-gui-config', () => {
        const component = mkConnectedComponent(<CustomGuiControls />, mkInitialState({
            'some-section': [
                {type: 'button', controls: [{}]}
            ]
        }));

        expect(component.getByRole('button')).to.exist;
    });

    it('should display radiobuttons from custom-gui-config', () => {
        const component = mkConnectedComponent(<CustomGuiControls />, mkInitialState({
            'some-section': [
                {
                    type: 'radiobutton', controls: [
                        {label: 'opt-1', value: 'val-1', active: false},
                        {label: 'opt-2', value: 'val-2', active: true}
                    ]
                }
            ]
        }));

        expect(component.getByText('opt-1', {selector: 'button'})).to.exist;
        expect(component.getByText('opt-2', {selector: 'button'})).to.exist;
    });

    ['button', 'radiobutton'].forEach((controlType) => {
        describe(`${controlType}`, () => {
            it(`should display all ${controlType}s`, () => {
                const component = mkConnectedComponent(<CustomGuiControls />, mkInitialState({
                    'some-section': [{
                        type: `${controlType}`,
                        controls: [{}, {}]
                    }]
                }));

                assert.equal(component.getAllByRole('button').length, 2);
            });

            it(`should give all ${controlType}s correct labels`, () => {
                const component = mkConnectedComponent(<CustomGuiControls />, mkInitialState({
                    'some-section': [{
                        type: `${controlType}`,
                        controls: [{label: 'foo'}, {label: 'bar'}]
                    }]
                }));

                expect(component.getByText('foo', {selector: 'button'})).to.exist;
                expect(component.getByText('bar', {selector: 'button'})).to.exist;
            });

            it(`should give all ${controlType}s correct values`, () => {
                const component = mkConnectedComponent(<CustomGuiControls />, mkInitialState({
                    'some-section': [{
                        type: `${controlType}`,
                        controls: [
                            {label: 'foo', value: 'foo-value'},
                            {label: 'bar', value: 'bar-value'}
                        ]
                    }]
                }));

                expect(component.getByText('foo', {selector: 'button'}).value).to.equal('foo-value');
                expect(component.getByText('bar', {selector: 'button'}).value).to.equal('bar-value');
            });

            it('should run custom action on click', async () => {
                const user = userEvent.setup();
                const component = mkConnectedComponent(<CustomGuiControls />, mkInitialState({
                    'some-section': [{
                        type: `${controlType}`,
                        controls: [{label: 'foo'}]
                    }]
                }));

                await user.click(component.getByRole('button'));

                assert.calledOnceWith(actionsStub.thunkRunCustomGuiAction);
            });

            it(`should set active ${controlType}`, () => {
                const component = mkConnectedComponent(<CustomGuiControls />, mkInitialState({
                    'some-section': [{
                        type: `${controlType}`,
                        controls: [
                            {label: 'foo', value: 'foo-value', active: true},
                            {label: 'bar', value: 'bar-value'}
                        ]
                    }]
                }));

                expect(component.getByText('foo', {selector: 'button'}).classList.contains('active')).to.be.true;
                expect(component.getByText('bar', {selector: 'button'}).classList.contains('active')).to.be.false;
            });
        });
    });
});
