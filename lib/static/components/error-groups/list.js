import React, {Component} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {bindActionCreators} from 'redux';

import ErrorGroupsItem from './item';
import * as actions from '../../modules/actions';

class ErrorGroupsList extends Component {
    static propTypes = {
        groupedErrors: PropTypes.array.isRequired
    };

    state = {
        errorGroupIndex: null
    };

    onErrorGroupChange = (index) => {
        const errorGroupIndex = this.state.errorGroupIndex === index ? null : index;
        const isActive = errorGroupIndex !== null;

        this.setState({errorGroupIndex}, () => {
            const browserIds = isActive ? this.props.groupedErrors[index].browserIds : [];
            this.props.actions.toggleErrorGroup({browserIds, isActive});
        });
    }

    render() {
        const {groupedErrors} = this.props;
        const {errorGroupIndex} = this.state;

        if (groupedErrors.length === 0) {
            return <div className="groupedErrors">
                There are no failed tests. To see passed tests disable "Group by error" mode.
            </div>;
        }

        return <div className="groupedErrors">
            {groupedErrors.map((group, ind) => {
                const isActive = ind === errorGroupIndex;

                return <ErrorGroupsItem
                    key={group.name}
                    group={group}
                    isActive={isActive}
                    onClick={() => this.onErrorGroupChange(ind)}
                />;
            })}
        </div>;
    }
}

export default connect(
    ({groupedErrors}) => ({groupedErrors}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(ErrorGroupsList);
