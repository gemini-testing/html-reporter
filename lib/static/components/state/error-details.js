'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import ToggleOpen from '../toggle-open';

export default class ErrorDetails extends Component {
    static propTypes = {
        errorDetails: PropTypes.object.isRequired
    };

    render() {
        const {title, filePath} = this.props.errorDetails;
        const content = <div className="toggle-open__item"><a href={filePath} target="_blank">{title}</a></div>;

        return <ToggleOpen title='Error details' content={content} extendClassNames="toggle-open_type_text"/>;
    }
}
