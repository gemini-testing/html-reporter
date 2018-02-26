'use strict';

import React, {Fragment} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import SectionBase from './section-base';
import BrowserTitle from './title/browser';
import BrowserSkippedTitle from './title/browser-skipped';
import Body from './body';
import {isFailStatus, isErroredStatus, isSkippedStatus, isUpdatedStatus} from '../../../common-utils';

export class SectionBrowser extends SectionBase {
    static propTypes = {
        browser: PropTypes.shape({
            name: PropTypes.string.isRequired,
            result: PropTypes.object.isRequired,
            retries: PropTypes.array
        }),
        suite: PropTypes.object,
        ...SectionBase.propTypes
    }

    componentWillMount() {
        const {result: {status}, retries = []} = this.props.browser;
        const failed = isErroredStatus(status) || isFailStatus(status);
        const retried = retries.length > 0;
        const updated = isUpdatedStatus(status);

        this.setState({
            failed,
            retried,
            skipped: isSkippedStatus(status),
            collapsed: this._shouldBeCollapsed({failed, retried, updated})
        });
    }

    render() {
        const {name, result, retries, result: {status}} = this.props.browser;

        const body = this.state.collapsed
            ? null
            : <Body result={result} suite={this.props.suite} retries={retries}/>;

        const section = this.state.skipped
            ? <BrowserSkippedTitle result={result}/>
            : (
                <Fragment>
                    <BrowserTitle name={name} result={result} handler={this._toggleState}/>
                    {body}
                </Fragment>
            );

        return (
            <div className={this._resolveSectionStatus(status)}>
                {section}
            </div>
        );
    }
}

export default connect(
    (state) => ({view: state.view})
)(SectionBrowser);
