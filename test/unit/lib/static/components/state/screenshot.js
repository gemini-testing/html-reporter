import React from 'react';
import Screenshot from 'lib/static/components/state/screenshot';

describe('Screenshot component', () => {
    it('should encode symbols in path', () => {
        const screenshotComponent = mount(<Screenshot image={{path: 'images/$/path'}} />);

        const image = screenshotComponent.find('img');

        assert.equal(image.getDOMNode().src, 'images/%24/path');
    });

    it('should replace backslashes with slashes for screenshots', () => {
        const screenshotComponent = mount(<Screenshot image={{path: 'images\\path'}} />);

        const image = screenshotComponent.find('img');

        assert.equal(image.getDOMNode().src, 'images/path');
    });
});
