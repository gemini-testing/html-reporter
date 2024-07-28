import {render} from '@testing-library/react';
import React from 'react';
import FullScreenshot from 'lib/static/components/state/screenshot/full';

describe('"FullScreenshot" component', () => {
    it('should encode symbols in path', () => {
        const screenshotComponent = render(<FullScreenshot image={{path: 'images/$/path'}} />);

        const image = screenshotComponent.getByRole('img');

        assert.include(image.src, 'images/%24/path');
    });

    it('should replace backslashes with slashes for screenshots', () => {
        const screenshotComponent = render(<FullScreenshot image={{path: 'images\\path'}} />);

        const image = screenshotComponent.getByRole('img');

        assert.include(image.src, 'images/path');
    });
});
