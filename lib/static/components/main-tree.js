import React, {Component} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';

import ErrorGroupsList from './error-groups/list';
import Suites from './suites';

class MainTree extends Component {
    static propTypes = {
        // from store
        groupByError: PropTypes.bool.isRequired
    }

    render() {
        return this.props.groupByError
            ? <ErrorGroupsList />
            : <Suites />;
    }
}

export default connect(
    ({view: {groupByError}}) => ({groupByError})
)(MainTree);
