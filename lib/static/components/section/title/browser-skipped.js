'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import Parser from 'html-react-parser';

class SectionBrowserTitleSkipped extends Component {
    static propTypes = {
        result: PropTypes.shape({
            name: PropTypes.string.isRequired,
            reason: PropTypes.string
        })
    }

    render() {
        const {name, reason} = this.props.result;

        return (
            <div className="section__title section__title_skipped">
                [skipped] {name}
                {reason && ', reason: '}
                {reason && Parser(reason)}
            </div>
        );
    }
}

export default SectionBrowserTitleSkipped;
