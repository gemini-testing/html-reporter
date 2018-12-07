'use strict';

import url from 'url';
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';

class BrowserTitle extends Component {
    static propTypes = {
        title: PropTypes.node.isRequired,
        result: PropTypes.object.isRequired,
        handler: PropTypes.func.isRequired,
        parsedHost: PropTypes.object
    }

    render() {
        const {title, result, handler, parsedHost} = this.props;

        return (
            <div className="section__title" onClick={handler}>
                {title}
                <a
                    className="button section__icon section__icon_view-local"
                    href={this._buildUrl(result.suiteUrl, parsedHost)}
                    onClick={(e) => e.stopPropagation()}
                    title="view in browser"
                    target="_blank">
                </a>
            </div>
        );
    }

    _buildUrl(href, host) {
        return host
            ? url.format(Object.assign(url.parse(href), host))
            : href;
    }
}

export default connect(
    (state) => ({parsedHost: state.view.parsedHost}),
    null
)(BrowserTitle);
