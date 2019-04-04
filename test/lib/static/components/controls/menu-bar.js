import React from 'react';
import {mkConnectedComponent} from '../utils';
import MenuBar from 'lib/static/components/controls/common-controls';
import {Dropdown} from 'semantic-ui-react';

describe('<MenuBar />', () => {
    it('should show passed items as links in dropdown menu', () => {
        const component = mkConnectedComponent(<MenuBar />, {
            initialState: {apiValues: {extraItems: {some: 'link'}}}
        });
        const dropDown = component.find(Dropdown.Item).first();

        assert.equal(dropDown.text(), 'some');
        assert.equal(dropDown.first().props().children.props.href, 'link');
    });

    it('should not show dropdown menu if extra items are not passed', () => {
        const component = mkConnectedComponent(<MenuBar />, {
            initialState: {apiValues: {extraItems: {}}}
        });
        const dropDown = component.find(Dropdown.Item).first();

        assert.equal(dropDown.length, 0);
    });
});
