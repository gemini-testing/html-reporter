import React, {Fragment, useContext, useLayoutEffect} from 'react';
import {last, isEmpty} from 'lodash';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import Parser from 'html-react-parser';
import PropTypes from 'prop-types';
import * as actions from '../../modules/actions';
import BrowserTitle from './title/browser';
import BrowserSkippedTitle from './title/browser-skipped';
import Body from './body';
import {isSkippedStatus} from '../../../common-utils';
import {sectionStatusResolver} from './utils';
import {MeasurementContext} from '../measurement-context';

function SectionBrowser(props) {
    const onToggleSection = () => {
        const {browserId, shouldBeOpened} = props;

        props.actions.toggleBrowserSection({browserId, shouldBeOpened: !shouldBeOpened});
    };

    const generateSkippedTitle = (skipReason) => {
        return (
            <Fragment>
                [skipped] {props.browser.name}
                {skipReason && ', reason: '}
                {skipReason && Parser(skipReason)}
            </Fragment>
        );
    };

    const {browser, shouldBeOpened, shouldBeShown, lastResult} = props;

    const {measure} = useContext(MeasurementContext);

    useLayoutEffect(() => {
        measure?.();
    }, [shouldBeShown, shouldBeOpened]);

    if (!shouldBeShown) {
        return null;
    }

    const isSkippedLastResult = isSkippedStatus(lastResult.status);
    const hasRetries = browser.resultIds.length > 1;

    const title = isSkippedLastResult
        ? generateSkippedTitle(lastResult.skipReason)
        : browser.name;

    // Detect executed test but failed and skipped
    const isExecutedResult = hasRetries || !isEmpty(lastResult.history) || lastResult.error || lastResult.imageIds.length > 0;
    const isSkipped = isSkippedLastResult && !isExecutedResult;

    const body = isSkipped || !shouldBeOpened
        ? null
        : (
            <div><Body
                browserId={browser.id}
                browserName={browser.name}
                testName={browser.parentId}
                resultIds={browser.resultIds}
            /></div>
        );

    const section = isSkipped
        ? <BrowserSkippedTitle title={title} browserId={browser.id} />
        : (
            <Fragment>
                <BrowserTitle
                    title={title}
                    browserId={browser.id}
                    browserName={browser.name}
                    lastResultId={lastResult.id}
                    handler={onToggleSection}
                />
                {body}
            </Fragment>
        );

    return (
        <div className={sectionStatusResolver({status: lastResult.status, shouldBeOpened})}>
            {section}
        </div>
    );
}

SectionBrowser.propTypes = {
    browserId: PropTypes.string.isRequired,
    // from store
    browser: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        resultIds: PropTypes.arrayOf(PropTypes.string).isRequired,
        parentId: PropTypes.string.isRequired
    }).isRequired,
    lastResult: PropTypes.shape({
        id: PropTypes.string.isRequired,
        status: PropTypes.string.isRequired,
        error: PropTypes.object,
        imageIds: PropTypes.arrayOf(PropTypes.string).isRequired,
        skipReason: PropTypes.string,
        history: PropTypes.arrayOf(PropTypes.string)
    }).isRequired,
    shouldBeShown: PropTypes.bool.isRequired,
    shouldBeOpened: PropTypes.bool.isRequired,
    actions: PropTypes.object.isRequired
};

export default connect(
    ({tree}, {browserId}) => {
        const browser = tree.browsers.byId[browserId];
        const {shouldBeOpened, shouldBeShown} = tree.browsers.stateById[browserId];
        const lastResult = tree.results.byId[last(browser.resultIds)];

        return {browser, lastResult, shouldBeShown, shouldBeOpened};
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(SectionBrowser);
