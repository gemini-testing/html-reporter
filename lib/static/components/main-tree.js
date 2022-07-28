import React, {Component} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';

import GroupTestsList from './group-tests/list';
import Suites from './suites';

class MainTree extends Component {
    static propTypes = {
        // from store
        groupTestsByKey: PropTypes.string.isRequired
    }

    render() {
        return this.props.groupTestsByKey
            ? <GroupTestsList key={this.props.groupTestsByKey} />
            : <Suites />;
    }
}

export default connect(
    ({view: {groupTestsByKey}}) => ({groupTestsByKey})
)(MainTree);
