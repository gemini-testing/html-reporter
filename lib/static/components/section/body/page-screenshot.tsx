import React, {Component} from 'react';
import Details from '../../details';
import ResizedScreenshot from '../../state/screenshot/resized';
import {ImageData} from '../../../../types';

interface PageScreenshotProps {
    image: ImageData;
}

export class PageScreenshot extends Component<PageScreenshotProps> {
    render(): JSX.Element {
        return <Details
            title="Page screenshot"
            content={(): JSX.Element => <ResizedScreenshot image={this.props.image}/>}
            extendClassNames="details_type_image"
        />;
    }
}
