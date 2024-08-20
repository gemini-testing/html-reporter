import React, {Component} from 'react';
import Details from '../../details';
import ResizedScreenshot from '../../state/screenshot/resized';
import {ImageFile} from '../../../../types';

interface PageScreenshotProps {
    image: ImageFile;
}

export class PageScreenshot extends Component<PageScreenshotProps> {
    render(): JSX.Element {
        return <Details
            title="Page screenshot"
            content={(): JSX.Element => <ResizedScreenshot image={this.props.image}/>}
        />;
    }
}
