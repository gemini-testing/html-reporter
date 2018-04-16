'use strict';

import React, {Fragment} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import SectionBase from './section-base';
import BrowserTitle from './title/browser';
import BrowserSkippedTitle from './title/browser-skipped';
import Body from './body';
import {isFailStatus, isErroredStatus, isSkippedStatus} from '../../../common-utils';

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

    _getStateFromProps() {
        const {expand, browser} = this.props;
        const {result: {status}, retries = []} = browser;
        const failed = isErroredStatus(status) || isFailStatus(status);
        const retried = retries.length > 0;
        const skipped = isSkippedStatus(status);

        return {failed, retried, skipped, expand};
    }
}

export default connect(
    ({view: {expand}}) => ({expand})
)(SectionBrowser);
