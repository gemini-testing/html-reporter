import React from 'react';
import Description from 'lib/static/components/section/body/description';
import {mkConnectedComponent} from '../../utils';

describe('<Description />', () => {
    const mkDescriptionComponent = (content) => {
        return mkConnectedComponent(<Description content={content} />, {});
    };

    it('should render component', () => {
        const component = mkDescriptionComponent('simple text');

        const descContent = component.find(Description).prop('content');

        assert.equal(descContent, 'simple text');
    });

    it('should render with "Description" title', () => {
        const component = mkDescriptionComponent('simple text');

        const detailsTitle = component.find('Details').prop('title');

        assert.equal(detailsTitle, 'Description');
    });

    it('should render markdown syntax', () => {
        const component = mkDescriptionComponent('### simple text');

        const detailsSummary = component.find('.details__summary');
        detailsSummary.simulate('click');

        const detailsContent = component.find('.details__content');

        assert.isTrue(detailsContent.contains(<h3>simple text</h3>));
    });
});
