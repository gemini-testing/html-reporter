'use strict';

import React, {Component} from 'react';
import Markdown from 'react-markdown';
import PropTypes from 'prop-types';
import Details from '../../details';

export default class Description extends Component {
    static propTypes = {
        content: PropTypes.string.isRequired
    }

    render() {
        const mdContent = <Markdown source={this.props.content}/>;

        return <Details title='Description' content={mdContent} extendClassNames='details_type_text'/>;
    }
}
