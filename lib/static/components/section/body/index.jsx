import React, {Fragment, useContext, useRef} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import {isNumber} from 'lodash';
import PropTypes from 'prop-types';
import RetrySwitcher from '../../retry-switcher';
import ControlButton from '../../controls/control-button';
import Result from './result';
import * as actions from '../../../modules/actions';
import ExtensionPoint from '../../extension-point';
import {RESULT} from '../../../../constants/extension-points';
import {ArrowRotateLeft} from '@gravity-ui/icons';
import useResizeObserver from '@react-hook/resize-observer';
import {MeasurementContext} from '../../measurement-context';

function Body(props) {
    const onRetrySwitcherChange = (index) => {
        const {browserId, retryIndex} = props;

        if (index === retryIndex) {
            return;
        }

        props.actions.changeTestRetry({browserId, retryIndex: index});
    };

    const onTestRetry = () => {
        const {testName, browserName} = props;

        props.actions.retryTest({testName, browserName});
    };

    const addRetrySwitcher = () => {
        const {resultIds, retryIndex} = props;

        if (resultIds.length <= 1) {
            return;
        }

        return (
            <div className="controls__item">
                <RetrySwitcher
                    resultIds={resultIds}
                    retryIndex={retryIndex}
                    onChange={onRetrySwitcherChange}
                />
            </div>
        );
    };

    const addRetryButton = () => {
        const {gui, running} = props;

        return gui
            ? (
                <div className="controls__item">
                    <ControlButton
                        label={<Fragment>
                            <ArrowRotateLeft/>
                            Retry
                        </Fragment>}
                        isSuiteControl={true}
                        isDisabled={running}
                        handler={onTestRetry}
                        dataTestId="test-retry"
                    />
                </div>
            )
            : null;
    };

    const getActiveResultId = () => {
        return props.resultIds[props.retryIndex];
    };

    const {testName} = props;
    const activeResultId = getActiveResultId();

    const {measure} = useContext(MeasurementContext);
    const resizeObserverRef = useRef(null);
    useResizeObserver(resizeObserverRef, () => {
        measure();
    });

    return (
        <div className="section__body" ref={resizeObserverRef}>
            <div className="image-box">
                <div className="controls">
                    {addRetrySwitcher()}
                    {addRetryButton()}
                </div>
                <ExtensionPoint name={RESULT} resultId={activeResultId} testName={testName}>
                    <Result resultId={activeResultId} testName={testName} />
                </ExtensionPoint>
            </div>
        </div>
    );
}

Body.propTypes = {
    browserId: PropTypes.string.isRequired,
    browserName: PropTypes.string.isRequired,
    testName: PropTypes.string.isRequired,
    resultIds: PropTypes.array.isRequired,
    onResize: PropTypes.func,
    // from store
    gui: PropTypes.bool.isRequired,
    running: PropTypes.bool.isRequired,
    retryIndex: PropTypes.number,
    actions: PropTypes.object.isRequired
};

export default connect(
    ({gui, running, view: {retryIndex: viewRetryIndex}, tree}, {browserId}) => {
        const {retryIndex: browserRetryIndex, lastMatchedRetryIndex} = tree.browsers.stateById[browserId] || {};
        let retryIndex;

        if (typeof viewRetryIndex === 'number') {
            retryIndex = Math.min(viewRetryIndex, browserRetryIndex);
        } else {
            retryIndex = isNumber(lastMatchedRetryIndex) ? lastMatchedRetryIndex : browserRetryIndex;
        }

        return {gui, running, retryIndex};
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(Body);
