import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import * as actions from '../../modules/actions';
import ControlButton from './control-button';
import {getAcceptableOpenedImageIds} from '../../modules/selectors/tree';
import {AnalyticsContext} from '@/static/new-ui/providers/analytics';

class AcceptOpenedButton extends Component {
    static contextType = AnalyticsContext;

    static propTypes = {
        isSuiteContol: PropTypes.bool,
        // from store
        processing: PropTypes.bool.isRequired,
        acceptableOpenedImageIds: PropTypes.arrayOf(PropTypes.string).isRequired,
        isStaticImageAccepterEnabled: PropTypes.bool,
        actions: PropTypes.object.isRequired
    };

    _acceptOpened = async () => {
        const analytics = this.context;
        await analytics?.trackOpenedScreenshotsAccept({acceptedImagesCount: this.props.acceptableOpenedImageIds.length});

        if (this.props.isStaticImageAccepterEnabled) {
            this.props.actions.staticAccepterStageScreenshot(this.props.acceptableOpenedImageIds);
        } else {
            this.props.actions.thunkAcceptImages({imageIds: this.props.acceptableOpenedImageIds});
        }
    };

    render() {
        const {acceptableOpenedImageIds, processing} = this.props;

        return <ControlButton
            label="Accept opened"
            isDisabled={!acceptableOpenedImageIds.length || processing}
            handler={this._acceptOpened}
            isSuiteControl={this.props.isSuiteContol}
        />;
    }
}

export default connect(
    (state) => {
        return {
            processing: state.processing,
            acceptableOpenedImageIds: getAcceptableOpenedImageIds(state),
            isStaticImageAccepterEnabled: state.staticImageAccepter.enabled
        };
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(AcceptOpenedButton);
