'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as actions from '../../modules/actions';

class FilterByNameInput extends Component {
    static propTypes = {
        filterByName: PropTypes.string.isRequired,
        actions: PropTypes.object.isRequired
    }

    constructor(props) {
        super(props);
        this._onChange = this._onChange.bind(this);
    }

    render() {
        return (
            <input
                className="text-input"
                size="100"
                value={this.props.filterByName}
                placeholder="filter by name"
                onChange={this._onChange}
            />
        );
    }

    _onChange(event) {
        this.props.actions.updateFilterByName(event.target.value);
    }
}

export default connect(
    (state) => ({filterByName: state.view.filterByName}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(FilterByNameInput);
