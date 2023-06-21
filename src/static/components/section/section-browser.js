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

class SectionBrowser extends Component {
    static propTypes = {
        browserId: PropTypes.string.isRequired,
        // from store
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
        shouldBeOpened: PropTypes.bool.isRequired,
        // from SectionCommonWrapper
        sectionStatusResolver: PropTypes.func.isRequired
    }

    onToggleSection = () => {
        const {browserId, shouldBeOpened} = this.props;

        this.props.actions.toggleBrowserSection({browserId, shouldBeOpened: !shouldBeOpened});
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

        const {browser, shouldBeOpened, lastResult} = this.props;

        const isSkippedLastResult = isSkippedStatus(lastResult.status);
        const hasRetries = browser.resultIds.length > 1;

        const title = isSkippedLastResult
            ? this._generateSkippedTitle(lastResult.skipReason)
            : browser.name;

        // Detect executed test but failed and skipped
        const isExecutedResult = hasRetries || lastResult.error || lastResult.imageIds.length > 0;
        const isSkipped = isSkippedLastResult && !isExecutedResult;

        const body = isSkipped || !shouldBeOpened
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
                        browserName={browser.name}
                        lastResultId={lastResult.id}
                        handler={this.onToggleSection}
                    />
                    {body}
                </Fragment>
            );

        return (
            <div className={this.props.sectionStatusResolver({status: lastResult.status, shouldBeOpened})}>
                {section}
            </div>
        );
    }
}

export default connect(
    ({tree}, {browserId}) => {
        const browser = tree.browsers.byId[browserId];
        const {shouldBeOpened, shouldBeShown} = tree.browsers.stateById[browserId];
        const lastResult = tree.results.byId[last(browser.resultIds)];

        return {browser, lastResult, shouldBeShown, shouldBeOpened};
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(SectionWrapper(SectionBrowser));
