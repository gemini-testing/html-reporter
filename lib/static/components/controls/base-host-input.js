'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as actions from '../../modules/actions';

class BaseHostInput extends Component {
    static propTypes = {
        baseHost: PropTypes.string.isRequired,
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
                size="35"
                value={this.props.baseHost}
                placeholder="change original host for view in browser"
                onChange={this._onChange}
            />
        );
    }

    _onChange(event) {
        this.props.actions.updateBaseHost(event.target.value);
    }
}

export default connect(
    (state) => ({baseHost: state.view.baseHost}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(BaseHostInput);
