'use strict';

import {Component} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {isFailStatus, isSkippedStatus} from '../../../common-utils';

export default class Base extends Component {
    static propTypes = {
        expand: PropTypes.string,
        showRetries: PropTypes.bool,
        viewMode: PropTypes.string
    }

    constructor(props) {
        super(props);
        this._toggleState = this._toggleState.bind(this);
    }

    componentWillMount() {
        const {failed, retried, skipped, expand, showRetries} = this._getStateFromProps();

        this.setState({
            failed,
            retried,
            skipped,
            collapsed: this._shouldBeCollapsed({failed, retried, expand, showRetries})
        });
    }

    componentWillReceiveProps(nextProps) {
        const {props} = this;
        const isNeedToUpdateState = nextProps.expand !== props.expand
             || nextProps.showRetries !== props.showRetries
             || nextProps.viewMode !== props.viewMode;
        if (isNeedToUpdateState) {
            const {failed, retried, updated} = this._getStateFromProps();
            const updatedStatus = {
                failed, retried, updated,
                expand: nextProps.expand,
                showRetries: nextProps.showRetries
            };

            this.setState({
                failed,
                retried,
                collapsed: this._shouldBeCollapsed(updatedStatus)
            });
        }
    }

    render() {
        return null;
    }

    _shouldBeCollapsed({failed, retried, expand, showRetries}) {
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
