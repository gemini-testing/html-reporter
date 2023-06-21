import React, {Component} from 'react';
import ClipboardButton from 'react-clipboard.js';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import {get} from 'lodash';
import * as actions from '../../../modules/actions';
import {appendQuery} from '../../../modules/query-params';
import viewModes from '../../../../constants/view-modes';
import {EXPAND_ALL} from '../../../../constants/expand-modes';
import ViewInBrowserIcon from '../../icons/view-in-browser';

class BrowserTitle extends Component {
    static propTypes = {
        title: PropTypes.node.isRequired,
        browserId: PropTypes.string.isRequired,
        browserName: PropTypes.string.isRequired,
        lastResultId: PropTypes.string.isRequired,
        handler: PropTypes.func.isRequired,
        // from store
        testName: PropTypes.string.isRequired,
        retryIndex: PropTypes.number.isRequired,
        suiteUrl: PropTypes.string,
        parsedHost: PropTypes.object
    }

    _getTestUrl() {
        const {browserName, testName, retryIndex} = this.props;

        return appendQuery(window.location.href, {
            browser: browserName,
            testNameFilter: testName,
            strictMatchFilter: true,
            retryIndex,
            viewModes: viewModes.ALL,
            expand: EXPAND_ALL
        });
    }

    onCopyTestLink = (e) => {
        e.stopPropagation();

        this.props.actions.copyTestLink();
    }

    render() {
        const {title, handler, lastResultId} = this.props;

        return (
            <div className="section__title section__title_type_browser" onClick={handler}>
                {title}
                <ViewInBrowserIcon resultId={lastResultId}/>
                <ClipboardButton
                    className="button custom-icon custom-icon_share"
                    onClick={this.onCopyTestLink}
                    button-title="copy test link"
                    option-text={() => this._getTestUrl()}>
                </ClipboardButton>
            </div>
        );
    }
}

export default connect(
    ({tree}, {browserId}) => {
        const browser = tree.browsers.byId[browserId];
        const browserState = tree.browsers.stateById[browserId];

        return {
            testName: browser.parentId,
            retryIndex: get(browserState, 'retryIndex', 0)
        };
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(BrowserTitle);
