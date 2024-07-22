import React from 'react';
import BrowserList from '../../../../../../../lib/static/components/controls/browser-list';
import {ThemeProvider} from '@gravity-ui/uikit';

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
        const component = mount(<ThemeProvider theme='light'><BrowserList {...props} /></ThemeProvider>);
        component.first().find('.g-select-control__button').simulate('click');

        assert.equal(component.first().find('.g-list__items .g-list__item_selected').length, 0);
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
        const component = mount(<ThemeProvider theme='light'><BrowserList {...props} /></ThemeProvider>);
        component.first().find('.g-select-control__button').simulate('click');

        assert.equal(component.first().find('.g-list__items .g-list__item_selected').length, 2);
        assert.equal(component.first().find('.g-list__items .g-list__item_selected .browserlist__row_content').at(0).text(), 'bro2');
        assert.equal(component.first().find('.g-list__items .g-list__item_selected .browserlist__row_content').at(1).text(), 'bro3');
    });

    it('should create groups for versions', async () => {
        const props = {
            available: [
                {id: 'bro1', versions: ['v1', 'v2', 'v3']}
            ],
            selected: [
                {id: 'bro1', versions: ['v1', 'v2']}
            ],
            onChange: () => {}
        };

        const component = mount(<ThemeProvider theme='light'><BrowserList {...props} /></ThemeProvider>);
        component.first().find('.g-select-control__button').simulate('click');

        assert.equal(component.find('.g-select-list__group-label-content').at(0).text(), 'bro1');
    });

    it('should trigger "change" event with selected browsers and versions', () => {
        const props = {
            available: [
                {id: 'bro'},
                {id: 'bro1', versions: ['v1']},
                {id: 'bro2', versions: ['v1', 'v2', 'v3']}
            ],
            selected: [
                {id: 'bro'},
                {id: 'bro1', versions: ['v1']},
                {id: 'bro2', versions: ['v1', 'v2', 'v3']}
            ],
            onChange: sandbox.spy()
        };
        const component = mount(<ThemeProvider theme='light'><BrowserList {...props} /></ThemeProvider>);

        component.first().find('.g-select-control__button').simulate('click');
        component.first().find('.g-popup .g-select-list__option').last().simulate('click');

        assert.equal(props.onChange.callCount, 2);
        assert.deepEqual(props.onChange.lastCall.lastArg, [
            {id: 'bro', versions: []},
            {id: 'bro1', versions: ['v1']},
            {id: 'bro2', versions: ['v1', 'v2']}
        ]);
    });
});
