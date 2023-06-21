import React from 'react';
import ResizedScreenshot from 'src/static/components/state/screenshot/resized';

describe('"ResizedScreenshot" component', () => {
    it('should encode symbols in path', () => {
        const screenshotComponent = mount(<ResizedScreenshot image={{path: 'images/$/path'}} />);

        const image = screenshotComponent.find('img');

        assert.equal(image.getDOMNode().src, 'images/%24/path');
    });

    it('should replace backslashes with slashes for screenshots', () => {
        const screenshotComponent = mount(<ResizedScreenshot image={{path: 'images\\path'}} />);

        const image = screenshotComponent.find('img');

        assert.equal(image.getDOMNode().src, 'images/path');
    });
});
