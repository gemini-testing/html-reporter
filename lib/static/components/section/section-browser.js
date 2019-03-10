'use strict';

import React, {Component, Fragment} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as actions from '../../modules/actions';
import PropTypes from 'prop-types';
import SectionWrapper from './section-wrapper';
import BrowserTitle from './title/browser';
import BrowserSkippedTitle from './title/browser-skipped';
import Body from './body';
import {isFailStatus, isErroredStatus, isSkippedStatus} from '../../../common-utils';
import Parser from 'html-react-parser';

class SectionBrowser extends Component {
    static propTypes = {
        browser: PropTypes.shape({
            name: PropTypes.string.isRequired,
            result: PropTypes.object.isRequired,
            retries: PropTypes.array
        }),
        suite: PropTypes.object,
        shouldBeOpened: PropTypes.func,
        sectionStatusResolver: PropTypes.func,
        toggleSection: PropTypes.func
    }

    constructor(props) {
        super(props);

        if (props.browser.hasOwnProperty('opened')) {
            return;
        }

        const {suite: {suitePath}, browser: {name: browserId}, toggleSection, shouldBeOpened} = props;
        const states = this._getStates();

        toggleSection({suitePath, browserId, opened: shouldBeOpened(states)});
    }

    _onToggleSection = () => {
        const {suite: {suitePath}, browser: {name: browserId, opened}, toggleSection} = this.props;

        toggleSection({suitePath, browserId, opened: !opened});
    }

    _getStates() {
        const {expand, browser} = this.props;
        const {result: {status}, retries = []} = browser;
        const failed = isErroredStatus(status) || isFailStatus(status);
        const retried = retries.length > 0;

        return {failed, retried, expand};
    }

    _generateSkippedTitle() {
        const {name, result: {skipReason}} = this.props.browser;
        return <Fragment>
            [skipped] {name}
            {skipReason && ', reason: '}
            {skipReason && Parser(skipReason)}
        </Fragment>;
    }

    render() {
        const {browser, suite} = this.props;
        const {name, result, retries = [], opened, result: {status}} = browser;
        const skipped = isSkippedStatus(status);
        const retried = retries.length > 0;

        const title = skipped
            ? this._generateSkippedTitle()
            : name;

        const body = opened
            ? <Body result={result} suite={suite} browser={browser} retries={retries} />
            : null;

        // Detect executed test but failed and skipped
        const executed = retried || result.error || (result.imagesInfo && result.imagesInfo.length > 0);
        const section = skipped && !executed
            ? <BrowserSkippedTitle title={title}/>
            : (
                <Fragment>
                    <BrowserTitle title={title} result={result} handler={this._onToggleSection}/>
                    {body}
                </Fragment>
            );

        return (
            <div className={this.props.sectionStatusResolver({status, opened})}>
                {section}
            </div>
        );
    }
}

export default connect(
    ({view: {expand}}) => ({expand}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(SectionWrapper(SectionBrowser));
