'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as actions from '../../modules/actions';
import {Select} from 'semantic-ui-react';

class ViewSelect extends Component {
    static propTypes = {
        view: PropTypes.object.isRequired,
        actions: PropTypes.object.isRequired,
        options: PropTypes.array.isRequired
    }

    constructor(props) {
        super(props);
        this._onChange = this._onChange.bind(this);
    }

    render() {
        const {view, options} = this.props;

        return (
            <Select className="select_type_view" value={view.viewMode} onChange={this._onChange} options={options}>
            </Select>
        );
    }

    _onChange(event) {
        this.props.actions.changeViewMode(event.target.value);
    }
}

export default connect(
    (state) => ({view: state.view}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(ViewSelect);
