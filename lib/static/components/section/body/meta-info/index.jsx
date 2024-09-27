import {Card} from '@gravity-ui/uikit';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {MetaInfo as MetaInfoContent} from '@/static/new-ui/components/MetaInfo';
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
            title='Meta'
            content={<Card className='details__card' view='filled'><MetaInfoContent resultId={resultId} qa={'meta-info'}/></Card>}
            onClick={this.onToggleMetaInfo}
        />;
    }
}

export default connect(
    null,
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(MetaInfo);
