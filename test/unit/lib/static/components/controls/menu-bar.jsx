import React from 'react';
import {mkConnectedComponent} from '../utils';
import MenuBar from 'lib/static/components/controls/common-controls';

describe('<MenuBar />', () => {
    it('should show passed items as links in dropdown menu', () => {
        const component = mkConnectedComponent(<MenuBar />, {
            initialState: {apiValues: {extraItems: {some: 'link'}}}
        });
        component.find('button.menu-bar__dropdown').simulate('click');
        const item = component.first().find('.menu-bar__content_item').first();

        assert.equal(item.text(), 'some');
        assert.equal(item.first().props().children.props.href, 'link');
    });

    it('should not show dropdown menu if extra items are not passed', () => {
        const component = mkConnectedComponent(<MenuBar />, {
            initialState: {apiValues: {extraItems: {}}}
        });
        const dropdown = component.find('.button.menu-bar__dropdown').first();

        assert.equal(dropdown.length, 0);
    });
});
