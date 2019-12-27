'use strict';

import React, {Component, Fragment} from 'react';
import PropTypes from 'prop-types';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as actions from '../../modules/actions';

class StrictMatchFilterInput extends Component {
    static propTypes = {
        strictMatchFilter: PropTypes.bool.isRequired,
        actions: PropTypes.object.isRequired
    }

    constructor(props) {
        super(props);

        this.state = {
            strictMatchFilter: this.props.strictMatchFilter
        };

        this._onChange = (event) => {
            this.setState({strictMatchFilter: event.target.checked});
            this.props.actions.setStrictMatchFilter(event.target.checked);
        };
    }

    render() {
        return (
            <Fragment>
                <input
                    type="checkbox"
                    id="strictMatchFilter"
                    onChange={this._onChange}
                    checked={this.state.strictMatchFilter}
                />
                <label
                    className="checkbox-label"
                    htmlFor="strictMatchFilter">
                    Strict match
                </label>
            </Fragment>
        );
    }
}

export default connect(
    (state) => ({strictMatchFilter: state.view.strictMatchFilter}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(StrictMatchFilterInput);
