import React from 'react';
import BrowserList from '../../../../../../../src/static/components/controls/browser-list';

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

        assert.equal(component.find('.array__container .array__item').length, 0);
    });

    it('should contain selected items', () => {
        const props = {
            available: [
                {id: 'bro1', versions: ['unknown']},
                {id: 'bro2', versions: ['unknown']},
                {id: 'bro3', versions: ['unknown']}
            ],
            selected: [
                {id: 'bro2', versions: ['unknown']},
                {id: 'bro3', versions: ['unknown']}
            ]
        };
        const component = mount(<BrowserList {...props} />);

        assert.equal(component.find('.array__container .array__item').length, 2);
        assert.equal(component.find('.array__container .array__item').at(0).text(), 'bro2');
        assert.equal(component.find('.array__container .array__item').at(1).text(), 'bro3');
    });

    it('should create nested checkboxes for versions', async () => {
        const props = {
            available: [
                {id: 'bro1', versions: ['v1', 'v2', 'v3']}
            ],
            selected: [
                {id: 'bro1', versions: ['v1', 'v2']}
            ],
            onChange: () => {}
        };

        const component = mount(<BrowserList {...props} />);
        component.find('.rct-collapse').first().simulate('click');

        assert.equal(component.find('.rct-node-leaf .rct-label__title').at(0).text(), 'v1');
        assert.equal(component.find('.rct-node-leaf .rct-label__title').at(1).text(), 'v2');
    });

    it('should trigger "change" event with selected browsers and versions', () => {
        const props = {
            available: [
                {id: 'bro'},
                {id: 'bro1', versions: ['v1']},
                {id: 'bro2', versions: ['v1', 'v2']}
            ],
            selected: [
                {id: 'bro'},
                {id: 'bro1', versions: ['v1']},
                {id: 'bro2', versions: ['v1']}
            ],
            onChange: sandbox.spy()
        };
        const component = mount(<BrowserList {...props} />);

        component.find('.rct-checkbox').first().simulate('click');

        assert.equal(props.onChange.callCount, 1);
        assert.deepEqual(props.onChange.firstCall.lastArg, [
            {id: 'bro1', versions: []},
            {id: 'bro2', versions: ['v1']}
        ]);
    });
});
