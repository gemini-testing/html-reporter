'use strict';

import {Component} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {isFailStatus, isSkippedStatus} from '../../../common-utils';

export default class Base extends Component {
    static propTypes = {
        expand: PropTypes.string,
        showRetries: PropTypes.bool
    }

    constructor(props) {
        super(props);
        this._toggleState = this._toggleState.bind(this);
    }

    render() {
        return null;
    }

    _shouldBeCollapsed({failed, retried, updated}) {
        const {expand, showRetries} = this.props;

        // return true;
        if (expand === 'errors' && failed || updated) {
            return false;
        } else if (showRetries && retried) {
            return false;
        } else if (expand === 'all') {
            return false;
        }

        return true;
    }

    _toggleState() {
        this.setState({collapsed: !this.state.collapsed});
    }

    _resolveSectionStatus(status) {
        const {collapsed} = this.state;
        const baseClasses = ['section', {'section_collapsed': collapsed}];

        if (status) {
            return classNames(baseClasses, `section_status_${status}`);
        }

        return classNames(
            baseClasses,
            {'section_status_skip': isSkippedStatus(status)},
            {'section_status_fail': isFailStatus(status)},
            {'section_status_success': !(isSkippedStatus(status) || isFailStatus(status))}
        );
    }
}
