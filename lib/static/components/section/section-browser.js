'use strict';

import React, {Fragment} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import SectionBase from './section-base';
import BrowserTitle from './title/browser';
import BrowserSkippedTitle from './title/browser-skipped';
import Body from './body';
import {isFailStatus, isErroredStatus, isSkippedStatus} from '../../../common-utils';
import Parser from 'html-react-parser';

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

        // skipped test with retry can has body
        const title = this.state.skipped
            ? this._generateSkippedTitle()
            : name;

        const body = this.state.collapsed
            ? null
            : <Body result={result} suite={this.props.suite} retries={retries}/>;

        const section = this.state.skipped && !this.state.retried
            ? <BrowserSkippedTitle title={title}/>
            : (
                <Fragment>
                    <BrowserTitle title={title} result={result} handler={this._toggleState}/>
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

    _generateSkippedTitle() {
        const {name, result: {skipReason}} = this.props.browser;
        return <Fragment>
            [skipped] {name}
            {skipReason && ', reason: '}
            {skipReason && Parser(skipReason)}
        </Fragment>;
    }
}

export default connect(
    ({view: {expand}}) => ({expand})
)(SectionBrowser);
