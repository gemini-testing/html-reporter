'use strict';

import url from 'url';
import React, {Component} from 'react';
import ClipboardButton from 'react-clipboard.js';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {appendQuery} from '../../../modules/query-params';
import viewModes from '../../../../constants/view-modes';

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
            <div className="section__title section__title_type_browser" onClick={handler}>
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

        return appendQuery(window.location.href, {
            browser: browser.name,
            testNameFilter: suite.suitePath.join(' '),
            strictMatchFilter: true,
            retryIndex: browser.state.retryIndex,
            viewModes: viewModes.ALL,
            expand: 'all',
            groupByError: false
        });
    }
}

export default connect(
    ({reporter: state}) => ({parsedHost: state.view.parsedHost}),
    null
)(BrowserTitle);
