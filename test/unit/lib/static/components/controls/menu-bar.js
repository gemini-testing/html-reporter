import React from 'react';
import {mkConnectedComponent} from '../utils';
import MenuBar from 'lib/static/components/controls/common-controls';

describe('<MenuBar />', () => {
    it('should show passed items as links in dropdown menu', () => {
        const component = mkConnectedComponent(<MenuBar />, {
            initialState: {apiValues: {extraItems: {some: 'link'}}}
        });
        const dropdown = component.find('.menu-bar .dropdown .item').first();

        assert.equal(dropdown.text(), 'some');
        assert.equal(dropdown.first().props().children.props.href, 'link');
    });

    it('should not show dropdown menu if extra items are not passed', () => {
        const component = mkConnectedComponent(<MenuBar />, {
            initialState: {apiValues: {extraItems: {}}}
        });
        const dropdown = component.find('.menu-bar .dropdown .item').first();

        assert.equal(dropdown.length, 0);
    });
});
