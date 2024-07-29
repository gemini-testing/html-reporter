import {expect} from 'chai';
import React from 'react';
import {mkConnectedComponent} from '../utils';
import MenuBar from 'lib/static/components/controls/common-controls';
import userEvent from '@testing-library/user-event';

describe('<MenuBar />', () => {
    it('should show passed items as links in dropdown menu', async () => {
        const user = userEvent.setup();
        const component = mkConnectedComponent(<MenuBar />, {
            initialState: {apiValues: {extraItems: {some: 'link'}}}
        });

        await user.click(component.getByRole('button'));

        expect(component.getByText('some')).to.exist;
        expect(component.getByText('some').href).to.equal('http://localhost/link');
    });

    it('should not show dropdown menu if extra items are not passed', () => {
        const component = mkConnectedComponent(<MenuBar />, {
            initialState: {apiValues: {extraItems: {}}}
        });

        expect(component.queryByRole('button')).to.not.exist;
    });
});
