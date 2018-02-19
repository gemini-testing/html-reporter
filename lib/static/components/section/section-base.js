'use strict';

import {Component} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export default class Base extends Component {
    static propTypes = {
        view: PropTypes.object
    }

    constructor(props) {
        super(props);
        this._toggleState = this._toggleState.bind(this);
    }

    render() {
        return null;
    }

    _shouldBeCollapsed(failed, retried) {
        const {expand, showRetries} = this.props.view;

        if (expand === 'errors' && failed) {
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
        const {failed, skipped, collapsed} = this.state;
        const baseClasses = ['section', {'section_collapsed': collapsed}];

        if (status) {
            return classNames(baseClasses, `section_status_${status}`);
        }

        return classNames(
            baseClasses,
            {'section_status_skip': skipped},
            {'section_status_fail': failed},
            {'section_status_success': !(skipped || failed)}
        );
    }
}
