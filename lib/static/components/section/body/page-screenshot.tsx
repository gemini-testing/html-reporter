import React, {Component} from 'react';
import Details from '../../details';
import {ImageFile} from '../../../../types';
import {Screenshot} from '@/static/new-ui/components/Screenshot';

interface PageScreenshotProps {
    image: ImageFile;
}

export class PageScreenshot extends Component<PageScreenshotProps> {
    render(): React.JSX.Element {
        return <Details
            title="Page screenshot"
            content={(): React.JSX.Element => <Screenshot image={this.props.image} />}
        />;
    }
}
