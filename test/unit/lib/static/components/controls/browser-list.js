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
                {id: 'bro2'},
                {id: 'bro3'}
            ]
        };
        const component = mount(<BrowserList {...props} />);

        assert.equal(component.find('.rc-tree-select-selection-item').length, 2);
        assert.equal(component.find('.rc-tree-select-selection-item').at(0).text(), 'bro2');
        assert.equal(component.find('.rc-tree-select-selection-item').at(1).text(), 'bro3');
    });

    it('should create nested checkboxes for versions', () => {
        const props = {
            available: [
                {id: 'bro1', versions: ['v1', 'v2', 'v3']}
            ],
            selected: [
                {id: 'bro1', versions: ['v1', 'v2']}
            ]
        };
        const component = mount(<BrowserList {...props} />);

        assert.equal(component.find('.rc-tree-select-selection-item').at(0).text(), 'bro1 (v1)');
        assert.equal(component.find('.rc-tree-select-selection-item').at(1).text(), 'bro1 (v2)');
    });

    it('should trigger "change" event with selected browsers and versions', () => {
        const props = {
            available: [
                {id: 'bro'},
                {id: 'bro1', versions: []},
                {id: 'bro2', versions: ['v1', 'v2']}
            ],
            selected: [
                {id: 'bro'},
                {id: 'bro1', versions: []},
                {id: 'bro2', versions: ['v1']}
            ],
            onChange: sandbox.spy()
        };
        const component = mount(<BrowserList {...props} />);

        component.find('.rc-tree-select-selection-item-remove').first().simulate('click');

        assert.equal(props.onChange.callCount, 1);
        assert.deepEqual(props.onChange.firstCall.lastArg, [
            {id: 'bro1', versions: []},
            {id: 'bro2', versions: ['v1']}
        ]);
    });
});
