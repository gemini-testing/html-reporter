import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import * as actions from '../../modules/actions';
import ControlButton from './control-button';
import {getFailedOpenedImageIds} from '../../modules/selectors/tree';

class FindSameDiffsButton extends Component {
    static propTypes = {
        imageId: PropTypes.string,
        browserId: PropTypes.string.isRequired,
        isDisabled: PropTypes.bool.isRequired,
        // from store
        browserName: PropTypes.string.isRequired,
        failedOpenedImageIds: PropTypes.arrayOf(PropTypes.string).isRequired
    }

    _findSameDiffs = () => {
        const {actions, imageId, failedOpenedImageIds, browserName} = this.props;

        actions.findSameDiffs(imageId, failedOpenedImageIds, browserName);
    }

    render() {
        const {isDisabled} = this.props;

        return <ControlButton
            label="🔍 Find same diffs"
            isSuiteControl={true}
            isDisabled={isDisabled}
            handler={this._findSameDiffs}
        />;
    }
}

export default connect(
    (state, {browserId}) => {
        const {name: browserName} = state.tree.browsers.byId[browserId];

        return {
            browserName,
            failedOpenedImageIds: getFailedOpenedImageIds(state)
        };
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(FindSameDiffsButton);
