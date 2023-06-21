import React from 'react';
import FullScreenshot from 'lib/static/components/state/screenshot/full';

describe('"FullScreenshot" component', () => {
    it('should encode symbols in path', () => {
        const screenshotComponent = mount(<FullScreenshot image={{path: 'images/$/path'}} />);

        const image = screenshotComponent.find('img');

        assert.equal(image.getDOMNode().src, 'images/%24/path');
    });

    it('should replace backslashes with slashes for screenshots', () => {
        const screenshotComponent = mount(<FullScreenshot image={{path: 'images\\path'}} />);

        const image = screenshotComponent.find('img');

        assert.equal(image.getDOMNode().src, 'images/path');
    });
});
