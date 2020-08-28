'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {Dropdown} from 'semantic-ui-react';
import * as actions from '../../modules/actions';

class ViewSelect extends Component {
    static propTypes = {
        viewMode: PropTypes.string.isRequired,
        actions: PropTypes.object.isRequired,
        options: PropTypes.array.isRequired
    }

    constructor(props) {
        super(props);
    }

    _onChange = (_, dom) => {
        this.props.actions.changeViewMode(dom.value);
    }

    render() {
        const {viewMode, options} = this.props;
        const formatedOpts = options.map(({value, text}) => ({
            value,
            text,
            key: value
        }));

        return (
            <div className="viewmode">
                <Dropdown
                    fluid
                    selection
                    options={formatedOpts}
                    value={viewMode}
                    onChange={this._onChange}
                />
            </div>
        );
    }
}

export default connect(
    ({view}) => ({viewMode: view.viewMode}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(ViewSelect);
