'use strict';

import React, {Component, Fragment} from 'react';
import Markdown from 'react-markdown';
import PropTypes from 'prop-types';
import ToggleOpen from './toggle-open';

export default class Description extends Component {
    static propTypes = {
        content: PropTypes.string.isRequired
    }

    render() {
        const mdContent = <Markdown source={this.props.content}/>;

        return (
            <Fragment>
                <ToggleOpen title='Description' content={mdContent}/>
            </Fragment>
        );
    }
}
