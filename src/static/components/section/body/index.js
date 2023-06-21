import React, {Component} from 'react';
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

class Body extends Component {
    static propTypes = {
        browserId: PropTypes.string.isRequired,
        browserName: PropTypes.string.isRequired,
        testName: PropTypes.string.isRequired,
        resultIds: PropTypes.array.isRequired,
        // from store
        gui: PropTypes.bool.isRequired,
        running: PropTypes.bool.isRequired,
        retryIndex: PropTypes.number
    }

    onRetrySwitcherChange = (index) => {
        const {browserId, retryIndex} = this.props;

        if (index === retryIndex) {
            return;
        }

        this.props.actions.changeTestRetry({browserId, retryIndex: index});
    }

    onTestRetry = () => {
        const {testName, browserName} = this.props;

        this.props.actions.retryTest({testName, browserName});
    }

    _addRetrySwitcher = () => {
        const {resultIds, retryIndex} = this.props;

        if (resultIds.length <= 1) {
            return;
        }

        return (
            <div className="controls__item">
                <RetrySwitcher
                    resultIds={resultIds}
                    retryIndex={retryIndex}
                    onChange={this.onRetrySwitcherChange}
                />
            </div>
        );
    }

    _addRetryButton = () => {
        const {gui, running} = this.props;

        return gui
            ? (
                <div className="controls__item">
                    <ControlButton
                        label="↻ Retry"
                        isSuiteControl={true}
                        isDisabled={running}
                        handler={this.onTestRetry}
                    />
                </div>
            )
            : null;
    }

    _getActiveResultId = () => {
        return this.props.resultIds[this.props.retryIndex];
    }

    render() {
        const {testName} = this.props;
        const activeResultId = this._getActiveResultId();

        return (
            <div className="section__body">
                <div className="image-box">
                    <div className="controls">
                        {this._addRetrySwitcher()}
                        {this._addRetryButton()}
                    </div>
                    <ExtensionPoint name={RESULT} resultId={activeResultId} testName={testName}>
                        <Result resultId={activeResultId} testName={testName} />
                    </ExtensionPoint>
                </div>
            </div>
        );
    }
}

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
