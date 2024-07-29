import {render} from '@testing-library/react';
import React from 'react';
import ResizedScreenshot from 'lib/static/components/state/screenshot/resized';

describe('"ResizedScreenshot" component', () => {
    it('should encode symbols in path', () => {
        const screenshotComponent = render(<ResizedScreenshot image={{path: 'images/$/path'}} />);

        const image = screenshotComponent.getByRole('img');

        assert.include(image.src, 'images/%24/path');
    });

    it('should replace backslashes with slashes for screenshots', () => {
        const screenshotComponent = render(<ResizedScreenshot image={{path: 'images\\path'}} />);

        const image = screenshotComponent.getByRole('img');

        assert.include(image.src, 'images/path');
    });
});
