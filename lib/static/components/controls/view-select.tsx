import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as actions from '../../modules/actions';
import {Select} from 'semantic-ui-react';

interface IViewSelect {
    view: any;
    actions: any;
    options: any;

}

class ViewSelect extends Component<IViewSelect> {

    constructor(props: any) {
        super(props);
        this._onChange = this._onChange.bind(this);
    }

    render() {
        const {view, options} = this.props;

        return (
            <Select className='select_type_view' value={view.viewMode} onChange={this._onChange} options={options}>
            </Select>
        );
    }

    _onChange(event: any) {
        this.props.actions.changeViewMode(event.target.value);
    }
}

export default connect(
    (state: any) => ({view: state.view}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(ViewSelect);
