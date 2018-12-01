'use strict';

import {Component} from 'react';
import * as React from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as actions from '../../modules/actions';
import {Input} from 'semantic-ui-react';

interface IBaseHostInput {
    baseHost: string;
    actions: any;
}

class BaseHostInput extends Component<IBaseHostInput> {

    constructor(props: any) {
        super(props);
        this._onChange = this._onChange.bind(this);
    }

    render() {
        return (
            <Input
                className='text-input'
                size='medium'
                value={this.props.baseHost}
                placeholder='change original host for view in browser'
                onChange={this._onChange}
            />
        );
    }

    _onChange(event: any) {
        this.props.actions.updateBaseHost(event.target.value);
    }
}

export default connect(
    (state: any) => ({baseHost: state.view.baseHost}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(BaseHostInput);
