'use strict';

import React, {Component} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import ClipboardButton from 'react-clipboard.js';
import {retrySuite} from '../../../modules/actions';

class SectionTitle extends Component {
    static propTypes = {
        name: PropTypes.string.isRequired,
        suite: PropTypes.shape({
            suitePath: PropTypes.array
        }).isRequired,
        handler: PropTypes.func.isRequired,
        gui: PropTypes.bool
    }

    onSuiteRetry = (e) => {
        e.stopPropagation();

        this.props.retrySuite(this.props.suite);
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
                onClick={(e) => e.stopPropagation()}
                className="button section__icon section__icon_copy-to-clipboard"
                title="copy to clipboard"
                data-clipboard-text={this.props.suite.suitePath.join(' ')}>
            </ClipboardButton>
        );
    }

    _drawRetryButton() {
        return (
            <button
                className="button section__icon section__icon_retry"
                title="retry suite"
                onClick={this.onSuiteRetry}>
            </button>
        );
    }
}

export default connect(({gui}) => ({gui}), {retrySuite})(SectionTitle);
