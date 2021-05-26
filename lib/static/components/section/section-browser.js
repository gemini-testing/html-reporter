import React, {Component, Fragment} from 'react';
import {last} from 'lodash';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import Parser from 'html-react-parser';
import PropTypes from 'prop-types';
import * as actions from '../../modules/actions';
import SectionWrapper from './section-wrapper';
import BrowserTitle from './title/browser';
import BrowserSkippedTitle from './title/browser-skipped';
import Body from './body';
import {isSkippedStatus} from '../../../common-utils';
import {isNodeFailed} from '../../modules/utils';
import {mkShouldBrowserBeShown, mkHasBrowserFailedRetries} from '../../modules/selectors/tree';

class SectionBrowser extends Component {
    static propTypes = {
        browserId: PropTypes.string.isRequired,
        errorGroupBrowserIds: PropTypes.array,
        // from store
        expand: PropTypes.string.isRequired,
        browser: PropTypes.shape({
            name: PropTypes.string.isRequired,
            resultIds: PropTypes.arrayOf(PropTypes.string).isRequired,
            parentId: PropTypes.string.isRequired
        }).isRequired,
        lastResult: PropTypes.shape({
            id: PropTypes.string.isRequired,
            status: PropTypes.string.isRequired,
            error: PropTypes.object,
            imageIds: PropTypes.arrayOf(PropTypes.string).isRequired,
            skipReason: PropTypes.string
        }).isRequired,
        shouldBeShown: PropTypes.bool.isRequired,
        hasFailedRetries: PropTypes.bool.isRequired,
        // from SectionCommonWrapper
        shouldBeOpened: PropTypes.func.isRequired,
        sectionStatusResolver: PropTypes.func.isRequired
    }

    state = {
        opened: this.props.shouldBeOpened(this._getStates())
    }

    // eslint-disable-next-line camelcase
    UNSAFE_componentWillReceiveProps(nextProps) {
        const updatedStates = this._getStates(nextProps);
        this.setState({opened: this.props.shouldBeOpened(updatedStates)});
    }

    _onToggleSection = () => {
        this.setState({opened: !this.state.opened});

        this.props.actions.toggleBrowserSection(this.props.browserId);
    }

    _getStates(props = this.props) {
        const {expand, lastResult, hasFailedRetries} = props;
        const failed = isNodeFailed(lastResult);
        const retried = hasFailedRetries;

        return {failed, retried, expand};
    }

    _generateSkippedTitle(skipReason) {
        return (
            <Fragment>
                [skipped] {this.props.browser.name}
                {skipReason && ', reason: '}
                {skipReason && Parser(skipReason)}
            </Fragment>
        );
    }

    render() {
        if (!this.props.shouldBeShown) {
            return null;
        }

        const {browser, lastResult} = this.props;
        const {opened} = this.state;

        const isSkippedLastResult = isSkippedStatus(lastResult.status);
        const hasRetries = browser.resultIds.length > 1;

        const title = isSkippedLastResult
            ? this._generateSkippedTitle(lastResult.skipReason)
            : browser.name;

        // Detect executed test but failed and skipped
        const isExecutedResult = hasRetries || lastResult.error || lastResult.imageIds.length > 0;
        const isSkipped = isSkippedLastResult && !isExecutedResult;

        const body = isSkipped || !opened
            ? null
            : (
                <Body
                    browserId={browser.id}
                    browserName={browser.name}
                    testName={browser.parentId}
                    resultIds={browser.resultIds}
                />
            );

        const section = isSkipped
            ? <BrowserSkippedTitle title={title} />
            : (
                <Fragment>
                    <BrowserTitle
                        title={title}
                        browserId={browser.id}
                        lastResultId={lastResult.id}
                        handler={this._onToggleSection}
                    />
                    {body}
                </Fragment>
            );

        return (
            <div className={this.props.sectionStatusResolver({status: lastResult.status, opened})}>
                {section}
            </div>
        );
    }
}

export default connect(
    () => {
        const hasBrowserFailedRetries = mkHasBrowserFailedRetries();
        const shouldBrowserBeShown = mkShouldBrowserBeShown();

        return (state, {browserId, errorGroupBrowserIds}) => {
            const browser = state.tree.browsers.byId[browserId];
            const lastResult = state.tree.results.byId[last(browser.resultIds)];
            const shouldBeShown = shouldBrowserBeShown(state, {browserId, result: lastResult, errorGroupBrowserIds});
            let hasFailedRetries = false;

            if (shouldBeShown) {
                hasFailedRetries = hasBrowserFailedRetries(state, {browserId});
            }

            return {
                expand: state.view.expand,
                browser,
                lastResult,
                shouldBeShown,
                hasFailedRetries
            };
        };
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(SectionWrapper(SectionBrowser));
