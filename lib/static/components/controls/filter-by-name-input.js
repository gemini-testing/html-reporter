'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import _ from 'lodash';
import * as actions from '../../modules/actions';

class FilterByNameInput extends Component {
    static propTypes = {
        filterByName: PropTypes.string.isRequired,
        actions: PropTypes.object.isRequired
    }

    constructor(props) {
        super(props);

        this.state = {
            filterByName: this.props.filterByName
        };

        this._onChange = (event) => {
            this.setState({filterByName: event.target.value});
            this._debouncedUpdate();
        };

        this._debouncedUpdate = _.debounce(
            () => {
                this.props.actions.updateFilterByName(this.state.filterByName);
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
                value={this.state.filterByName}
                placeholder="filter by name"
                onChange={this._onChange}
            />
        );
    }
}

export default connect(
    (state) => ({filterByName: state.view.filterByName}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(FilterByNameInput);
