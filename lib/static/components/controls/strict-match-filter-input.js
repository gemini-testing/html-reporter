'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {Checkbox} from 'semantic-ui-react';
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
    }

    _onChange = () => {
        const nextState = !this.state.strictMatchFilter;

        this.setState({strictMatchFilter: nextState});
        this.props.actions.setStrictMatchFilter(nextState);
    }

    render() {
        return (
            <div className="strict-match-filter">
                <Checkbox
                    toggle
                    label="Strict match"
                    onChange={this._onChange}
                    checked={this.state.strictMatchFilter}
                />
            </div>
        );
    }
}

export default connect(
    (state) => ({strictMatchFilter: state.view.strictMatchFilter}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(StrictMatchFilterInput);
