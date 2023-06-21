'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';

class BrowserSkippedTitle extends Component {
    static propTypes = {
        title: PropTypes.object.isRequired
    }

    render() {
        const {title} = this.props;

        return (
            <div className="section__title section__title_skipped">
                {title}
            </div>
        );
    }
}

export default BrowserSkippedTitle;
