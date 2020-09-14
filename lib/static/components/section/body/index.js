import React, {Component} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import PropTypes from 'prop-types';
import RetrySwitcher from './retry-switcher';
import ControlButton from '../../controls/control-button';
import Result from './result';
import * as actions from '../../../modules/actions';
import ExtensionPoint from '../../extension-point';

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

    constructor(props) {
        super(props);

        const retry = typeof this.props.retryIndex === 'number'
            ? Math.min(this.props.retryIndex, this.props.resultIds.length - 1)
            : this.props.resultIds.length - 1;

        this.state = {retry};
        this._changeTestRetry({retryIndex: retry});
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.resultIds.length > this.props.resultIds.length) {
            const lastRetryIndex = nextProps.resultIds.length - 1;
            this.setState({retry: lastRetryIndex});
            this._changeTestRetry({retryIndex: lastRetryIndex});
        }
    }

    onRetrySwitcherChange = (index) => {
        this.setState({retry: index});
        this._changeTestRetry({retryIndex: index});
    }

    onTestRetry = () => {
        const {testName, browserName} = this.props;

        this.props.actions.retryTest({testName, browserName});
    }

    _changeTestRetry({retryIndex}) {
        const {browserId} = this.props;

        this.props.actions.changeTestRetry({browserId, retryIndex});
    }

    _addRetrySwitcher = () => {
        const {resultIds} = this.props;

        if (resultIds.length <= 1) {
            return;
        }

        return (
            <div className="controls__item">
                <RetrySwitcher
                    resultIds={resultIds}
                    retryIndex={this.state.retry}
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
        return this.props.resultIds[this.state.retry];
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
                    <ExtensionPoint name="result" resultId={activeResultId} testName={testName}>
                        <Result resultId={activeResultId} testName={testName} />
                    </ExtensionPoint>
                </div>
            </div>
        );
    }
}

export default connect(
    ({gui, running, view: {retryIndex}}) => ({gui, running, retryIndex}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(Body);
