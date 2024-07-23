import React, {Component} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import PropTypes from 'prop-types';
import MetaInfoContent from './content';
import * as actions from '../../../../modules/actions';
import Details from '../../../details';

class MetaInfo extends Component {
    static propTypes = {
        resultId: PropTypes.string.isRequired,
        actions: PropTypes.object.isRequired
    };

    onToggleMetaInfo = () => {
        this.props.actions.toggleMetaInfo();
    };

    render() {
        const {resultId} = this.props;

        return <Details
            type='text'
            title='Meta'
            content={<MetaInfoContent resultId={resultId}/>}
            onClick={this.onToggleMetaInfo}
        />;
    }
}

export default connect(
    null,
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(MetaInfo);
