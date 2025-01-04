import React, {Component, Fragment} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import * as actions from '../../modules/actions';
import ControlButton from './control-button';
import {getFailedOpenedImageIds} from '../../modules/selectors/tree';
import {Magnifier} from '@gravity-ui/icons';

class FindSameDiffsButton extends Component {
    static propTypes = {
        imageId: PropTypes.string,
        browserId: PropTypes.string.isRequired,
        isDisabled: PropTypes.bool.isRequired,
        // from store
        browserName: PropTypes.string.isRequired,
        failedOpenedImageIds: PropTypes.arrayOf(PropTypes.string).isRequired,
        actions: PropTypes.object.isRequired
    };

    _findSameDiffs = () => {
        const {actions, imageId, failedOpenedImageIds, browserName} = this.props;

        actions.thunkFindSameDiffs(imageId, failedOpenedImageIds, browserName);
    };

    render() {
        const {isDisabled} = this.props;

        return <ControlButton
            label={<Fragment>
                <Magnifier/>
                Find same diffs
            </Fragment>}
            isSuiteControl={true}
            isDisabled={isDisabled}
            handler={this._findSameDiffs}
            dataTestId={'find-same-diffs'}
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
