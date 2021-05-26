import url from 'url';
import React, {Component} from 'react';
import ClipboardButton from 'react-clipboard.js';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import {get} from 'lodash';
import * as actions from '../../../modules/actions';
import {appendQuery} from '../../../modules/query-params';
import viewModes from '../../../../constants/view-modes';

class BrowserTitle extends Component {
    static propTypes = {
        title: PropTypes.node.isRequired,
        browserId: PropTypes.string.isRequired,
        lastResultId: PropTypes.string.isRequired,
        handler: PropTypes.func.isRequired,
        // from store
        testName: PropTypes.string.isRequired,
        retryIndex: PropTypes.number.isRequired,
        suiteUrl: PropTypes.string,
        parsedHost: PropTypes.object
    }

    _buildUrl(href, host) {
        return host
            ? url.format(Object.assign(url.parse(href), host))
            : href;
    }

    _getTestUrl() {
        const {title, testName, retryIndex} = this.props;

        return appendQuery(window.location.href, {
            browser: title,
            testNameFilter: testName,
            strictMatchFilter: true,
            retryIndex,
            viewModes: viewModes.ALL,
            expand: 'all',
            groupByError: false
        });
    }

    onViewInBrowser = (e) => {
        e.stopPropagation();

        this.props.actions.viewInBrowser();
    }

    onCopyTestLink = (e) => {
        e.stopPropagation();

        this.props.actions.copyTestLink();
    }

    render() {
        const {title, suiteUrl, handler, parsedHost} = this.props;

        return (
            <div className="section__title section__title_type_browser" onClick={handler}>
                {title}
                <a
                    className="button section__icon section__icon_view-local"
                    href={this._buildUrl(suiteUrl, parsedHost)}
                    onClick={this.onViewInBrowser}
                    title="view in browser"
                    target="_blank">
                </a>
                <ClipboardButton
                    className="button section__icon section__icon_share"
                    onClick={this.onCopyTestLink}
                    button-title="copy test link"
                    option-text={() => this._getTestUrl()}>
                </ClipboardButton>
            </div>
        );
    }
}

export default connect(
    ({tree, view}, {browserId, lastResultId}) => {
        const browser = tree.browsers.byId[browserId];
        const browserState = tree.browsers.stateById[browserId];
        const lastResult = tree.results.byId[lastResultId];

        return {
            testName: browser.parentId,
            retryIndex: get(browserState, 'retryIndex', 0),
            suiteUrl: lastResult.suiteUrl,
            parsedHost: view.parsedHost
        };
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(BrowserTitle);
