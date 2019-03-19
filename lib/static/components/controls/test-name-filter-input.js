'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {debounce} from 'lodash';
import * as actions from '../../modules/actions';

class TestNameFilterInput extends Component {
    static propTypes = {
        testNameFilter: PropTypes.string.isRequired,
        actions: PropTypes.object.isRequired
    }

    constructor(props) {
        super(props);

        this.state = {
            testNameFilter: this.props.testNameFilter
        };

        this._onChange = (event) => {
            this.setState({testNameFilter: event.target.value});
            this._debouncedUpdate();
        };

        this._debouncedUpdate = debounce(
            () => {
                this.props.actions.updateTestNameFilter(this.state.testNameFilter);
            },
            500,
            {
                'maxWait': 1000
            }
        );
    }

    render() {
        return (
            <input
                className="text-input"
                size="100"
                value={this.state.testNameFilter}
                placeholder="filter by test name"
                onChange={this._onChange}
            />
        );
    }
}

export default connect(
    (state) => ({testNameFilter: state.view.testNameFilter}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(TestNameFilterInput);
