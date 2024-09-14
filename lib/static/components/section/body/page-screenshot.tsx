import React, {Component} from 'react';
import Details from '../../details';
import {ImageFile} from '../../../../types';
import {Screenshot} from '@/static/new-ui/components/Screenshot';

interface PageScreenshotProps {
    image: ImageFile;
}

export class PageScreenshot extends Component<PageScreenshotProps> {
    render(): JSX.Element {
        return <Details
            title="Page screenshot"
            content={(): JSX.Element => <Screenshot src={this.props.image.path} size={this.props.image.size}/>}
        />;
    }
}
