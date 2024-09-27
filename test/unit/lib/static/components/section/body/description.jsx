import userEvent from '@testing-library/user-event';
import {expect} from 'chai';
import React from 'react';
import Description from 'lib/static/components/section/body/description';
import {mkConnectedComponent} from '../../../utils';

describe('<Description />', () => {
    const mkDescriptionComponent = (content) => {
        return mkConnectedComponent(<Description content={content} />, {});
    };

    it('should render component', async () => {
        const user = userEvent.setup();

        const component = mkDescriptionComponent('simple text');
        await user.click(component.getByText('Description'));

        expect(component.getByText('simple text')).to.exist;
    });

    it('should render with "Description" title', () => {
        const component = mkDescriptionComponent('simple text');

        expect(component.getByText('Description', {exact: false})).to.exist;
    });

    it('should render markdown syntax', async () => {
        const user = userEvent.setup();
        const component = mkDescriptionComponent('### simple text');

        await user.click(component.getByText('Description'));

        const transformedMarkdown = component.getByText('simple text').parentNode.innerHTML;

        expect(transformedMarkdown).to.equal('<h3>simple text</h3>');
    });
});
