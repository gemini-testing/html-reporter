import {render} from '@testing-library/react';
import React from 'react';
import {Screenshot} from '@/static/new-ui/components/Screenshot';

describe('"FullScreenshot" component', () => {
    it('should encode symbols in path', () => {
        const screenshotComponent = render(<Screenshot image={{path: 'images/$/path'}} />);

        const image = screenshotComponent.getByRole('img') as HTMLImageElement;

        assert.include(image.src, 'images/%24/path');
    });

    it('should replace backslashes with slashes for screenshots', () => {
        const screenshotComponent = render(<Screenshot image={{path: 'images\\path'}} />);

        const image = screenshotComponent.getByRole('img') as HTMLImageElement;

        assert.include(image.src, 'images/path');
    });
});
