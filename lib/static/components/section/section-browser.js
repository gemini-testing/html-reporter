'use strict';

import React, {Component, Fragment} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import Parser from 'html-react-parser';
import * as actions from '../../modules/actions';
import PropTypes from 'prop-types';
import SectionWrapper from './section-wrapper';
import BrowserTitle from './title/browser';
import BrowserSkippedTitle from './title/browser-skipped';
import Body from './body';
import {isFailStatus, isErroredStatus, isSkippedStatus} from '../../../common-utils';

class SectionBrowser extends Component {
    static propTypes = {
        browser: PropTypes.shape({
            name: PropTypes.string.isRequired,
            result: PropTypes.object.isRequired,
            retries: PropTypes.array
        }),
        suite: PropTypes.object,
        shouldBeOpened: PropTypes.func,
        sectionStatusResolver: PropTypes.func
    }

    state = {
        opened: this.props.shouldBeOpened(this._getStates())
    }

    componentWillReceiveProps(nextProps) {
        const updatedStates = this._getStates(nextProps);
        this.setState({opened: this.props.shouldBeOpened(updatedStates)});
    }

    _onToggleSection = () => {
        this.setState({opened: !this.state.opened});
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
        const {name, result, retries = [], result: {status}} = browser;
        const {opened} = this.state;
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
            ? <BrowserSkippedTitle title={title} />
            : (
                <Fragment>
                    <BrowserTitle title={title} result={result} handler={this._onToggleSection} />
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
