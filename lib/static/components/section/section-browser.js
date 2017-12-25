'use strict';

import React, {Fragment} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import SectionBase from './section-base';
import BrowserTitle from './title/browser';
import BrowserSkippedTitle from './title/browser-skipped';
import Body from './body';

export class SectionBrowser extends SectionBase {
    static propTypes = {
        browser: PropTypes.shape({
            name: PropTypes.string.isRequired,
            result: PropTypes.object.isRequired,
            retries: PropTypes.array
        }),
        ...SectionBase.propTypes
    }

    componentWillMount() {
        const {result, retries = []} = this.props.browser;
        const {error, fail, skipped} = result;
        const failed = error || fail;
        const retried = retries.length > 0;

        this.setState({
            failed,
            retried,
            skipped: !!skipped,
            collapsed: this._shouldBeCollapsed(failed, retried)
        });
    }

    render() {
        const {name, result, retries} = this.props.browser;

        const body = this.state.collapsed
            ? null
            : <Body result={result} retries={retries}/>;

        const section = result.skipped
            ? <BrowserSkippedTitle result={result}/>
            : (
                <Fragment>
                    <BrowserTitle name={name} result={result} handler={this._toggleState}/>
                    {body}
                </Fragment>
            );

        return (
            <div className={this._resolveSectionStatus()}>
                {section}
            </div>
        );
    }
}

export default connect(
    (state) => ({view: state.view})
)(SectionBrowser);
