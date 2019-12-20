'use strict';

import url from 'url';
import React, {Component} from 'react';
import ClipboardButton from 'react-clipboard.js';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {getUrlWithQuery} from '../../../modules/query-params';

class BrowserTitle extends Component {
    static propTypes = {
        title: PropTypes.node.isRequired,
        result: PropTypes.object.isRequired,
        suite: PropTypes.object.isRequired,
        browser: PropTypes.object.isRequired,
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
                <ClipboardButton
                    className="button section__icon section__icon_share"
                    onClick={(e) => e.stopPropagation()}
                    button-title="copy test link"
                    option-text={() => this._getTestUrl()}>
                </ClipboardButton>
            </div>
        );
    }

    _buildUrl(href, host) {
        return host
            ? url.format(Object.assign(url.parse(href), host))
            : href;
    }

    _getTestUrl() {
        const {browser, suite} = this.props;

        return getUrlWithQuery(window.location.href, {
            browser: browser.name,
            testNameFilter: suite.suitePath.join(' '),
            retryIndex: browser.state.retryIndex,
            viewMode: 'all',
            expand: 'all',
            groupByError: false
        });
    }
}

export default connect(
    (state) => ({parsedHost: state.view.parsedHost}),
    null
)(BrowserTitle);
