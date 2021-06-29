'use strict';

import React, {Component} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import PropTypes from 'prop-types';
import ClipboardButton from 'react-clipboard.js';
import * as actions from '../../../modules/actions';
import {mkGetTestsBySuiteId} from '../../../modules/selectors/tree';

class SectionTitle extends Component {
    static propTypes = {
        name: PropTypes.string.isRequired,
        suiteId: PropTypes.string.isRequired,
        handler: PropTypes.func.isRequired,
        // from store
        gui: PropTypes.bool.isRequired,
        serverStopped: PropTypes.bool.isRequired,
        suiteTests: PropTypes.arrayOf(PropTypes.shape({
            testName: PropTypes.string,
            browserName: PropTypes.string
        })).isRequired
    }

    onCopySuiteName = (e) => {
        e.stopPropagation();

        this.props.actions.copySuiteName(this.props.suiteId);
    }

    onSuiteRetry = (e) => {
        e.stopPropagation();

        this.props.actions.retrySuite(this.props.suiteTests);
    }

    render() {
        const {name, handler, gui} = this.props;

        return (
            <div className="section__title" onClick={handler}>
                {name}
                {this._drawCopyButton()}
                {gui && this._drawRetryButton()}
            </div>
        );
    }

    _drawCopyButton() {
        return (
            <ClipboardButton
                onClick={this.onCopySuiteName}
                className="button section__icon section__icon_copy-to-clipboard"
                button-title="copy to clipboard"
                data-clipboard-text={this.props.suiteId}>
            </ClipboardButton>
        );
    }

    _drawRetryButton() {
        return (
            <button
                disabled={this.props.serverStopped}
                className="button section__icon section__icon_retry"
                title="retry suite"
                onClick={this.onSuiteRetry}>
            </button>
        );
    }
}

export default connect(
    () => {
        const getTestsBySuiteId = mkGetTestsBySuiteId();

        return (state, {suiteId}) => {
            return {
                gui: state.gui,
                serverStopped: state.serverStopped,
                suiteTests: getTestsBySuiteId(state, {suiteId})
            };
        };
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(SectionTitle);
