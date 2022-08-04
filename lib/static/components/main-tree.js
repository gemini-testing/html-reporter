import React, {Component} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';

import GroupTestsList from './group-tests/list';
import Suites from './suites';

class MainTree extends Component {
    static propTypes = {
        // from store
        keyToGroupTestsBy: PropTypes.string.isRequired
    }

    render() {
        return this.props.keyToGroupTestsBy
            ? <GroupTestsList key={this.props.keyToGroupTestsBy} />
            : <Suites />;
    }
}

export default connect(
    ({view: {keyToGroupTestsBy}}) => ({keyToGroupTestsBy})
)(MainTree);
