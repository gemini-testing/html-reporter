'use strict';

import React, {Fragment, Component} from 'react';
import ToggleOpen from './toggle-open';
const ReactMarkdown = require('react-markdown');

interface IDescriptionChildProps extends React.Props<any> {
    content: string;
}

export default class Description extends Component<IDescriptionChildProps> {
    render() {
        const mdContent = <ReactMarkdown source={this.props.content}/>;

        return (
            <Fragment>
                <ToggleOpen title='Description' content={mdContent}/>
            </Fragment>
        );
    }
}
