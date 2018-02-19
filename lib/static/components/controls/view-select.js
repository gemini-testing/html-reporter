'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as actions from '../../modules/actions';

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

        const optionElems = options.map((option) => {
            return <option key={option.value} value={option.value}>{option.text}</option>;
        });

        return (
            <select className="select_type_view" value={view.viewMode} onChange={this._onChange}>
                {optionElems}
            </select>
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
