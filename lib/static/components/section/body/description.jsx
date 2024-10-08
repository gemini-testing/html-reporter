import React, {Component} from 'react';
import Markdown from 'react-markdown';
import PropTypes from 'prop-types';
import Details from '../../details';

export default class Description extends Component {
    static propTypes = {
        content: PropTypes.string.isRequired
    };

    _renderDescription = () => {
        return <Markdown>{this.props.content}</Markdown>;
    };

    render() {
        return <Details
            title='Description'
            content={this._renderDescription}
        />;
    }
}
