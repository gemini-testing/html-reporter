import React from 'react';
import {Button} from 'semantic-ui-react';
import proxyquire from 'proxyquire';
import {mkConnectedComponent} from '../utils';

describe('<CustomGuiControls />', () => {
    const sandbox = sinon.sandbox.create();

    let CustomGuiControls;
    let actionsStub;

    const mkInitialState = (customGui) => ({initialState: {config: {customGui}}});

    beforeEach(() => {
        actionsStub = {
            runCustomGuiAction: sandbox.stub().returns({type: 'some-type'})
        };

        CustomGuiControls = proxyquire('src/static/components/controls/custom-gui-controls', {
            '../../modules/actions': actionsStub
        }).default;
    });

    afterEach(() => sandbox.restore());

    it('should display nothing if custom-gui-config is empty', () => {
        const component = mkConnectedComponent(<CustomGuiControls />, mkInitialState({}));

        assert.equal(component.html().length, 0);
    });

    it('should display nothing if control type is not supported', () => {
        const component = mkConnectedComponent(<CustomGuiControls />, mkInitialState({
            'some-section': [
                {type: 'unknown'}
            ]
        }));

        assert.equal(component.html().length, 0);
    });

    it('should display buttons from custom-gui-config', () => {
        const component = mkConnectedComponent(<CustomGuiControls />, mkInitialState({
            'some-section': [
                {type: 'button', controls: [{}]}
            ]
        }));

        assert.equal(component.find(Button).length, 1);
    });

    it('should display radiobuttons from custom-gui-config', () => {
        const component = mkConnectedComponent(<CustomGuiControls />, mkInitialState({
            'some-section': [
                {type: 'radiobutton'}
            ]
        }));

        assert.equal(component.find(Button.Group).length, 1);
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

                assert.equal(component.children().find(Button).length, 2);
            });

            it(`should give all ${controlType}s correct labels`, () => {
                const component = mkConnectedComponent(<CustomGuiControls />, mkInitialState({
                    'some-section': [{
                        type: `${controlType}`,
                        controls: [{label: 'foo'}, {label: 'bar'}]
                    }]
                }));

                assert.equal(component.children().find('[content="foo"]').length, 1);
                assert.equal(component.children().find('[content="bar"]').length, 1);
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

                assert.equal(component.children().find('[content="foo"]').prop('value'), 'foo-value');
                assert.equal(component.children().find('[content="bar"]').prop('value'), 'bar-value');
            });

            it('should run custom action on click', () => {
                const component = mkConnectedComponent(<CustomGuiControls />, mkInitialState({
                    'some-section': [{
                        type: `${controlType}`,
                        controls: [{label: 'foo'}]
                    }]
                }));

                component.children().find(Button).simulate('click');

                assert.calledOnceWith(actionsStub.runCustomGuiAction);
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

                assert.isTrue(component.children().find('[content="foo"]').prop('active'));
                assert.isFalse(component.children().find('[content="bar"]').prop('active'));
            });
        });
    });
});
