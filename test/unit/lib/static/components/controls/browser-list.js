import React from 'react';
import BrowserList from '../../../../../../lib/static/components/controls/browser-list';

describe('<BrowserList />', () => {
    const sandbox = sinon.sandbox.create();

    afterEach(() => sandbox.restore());

    it('should not contain selected items', () => {
        const props = {
            available: [
                {id: 'bro1'},
                {id: 'bro2'}
            ]
        };
        const component = mount(<BrowserList {...props} />);

        assert.equal(component.find('.rc-tree-select-selection-item').length, 0);
    });

    it('should contain selected items', () => {
        const props = {
            available: [
                {id: 'bro1'},
                {id: 'bro2'},
                {id: 'bro3'}
            ],
            selected: [
                'bro2',
                'bro3'
            ]
        };
        const component = mount(<BrowserList {...props} />);

        assert.equal(component.find('.rc-tree-select-selection-item').length, 2);
        assert.equal(component.find('.rc-tree-select-selection-item').at(0).text(), 'bro2');
        assert.equal(component.find('.rc-tree-select-selection-item').at(1).text(), 'bro3');
    });

    it('should trigger "change" event when selected items have changed', () => {
        const props = {
            available: [
                {id: 'bro1'},
                {id: 'bro2'}
            ],
            selected: [
                'bro2'
            ],
            onChange: sandbox.spy()
        };
        const component = mount(<BrowserList {...props} />);

        component.find('.rc-tree-select-selection-item-remove').first().simulate('click');

        assert.equal(props.onChange.callCount, 1);
        assert.equal(props.onChange.firstCall.lastArg.triggerValue, 'bro2');
    });
});
