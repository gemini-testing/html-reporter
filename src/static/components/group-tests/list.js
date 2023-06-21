import React, {Component} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {bindActionCreators} from 'redux';

import GroupTestsItem from './item';
import {groupedTestsType} from './prop-types';
import * as actions from '../../modules/actions';
import {getParsedKeyToGroupTestsBy} from '../../modules/selectors/grouped-tests';

class GroupTestsList extends Component {
    static propTypes = {
        // from store
        groupedTests: groupedTestsType.isRequired,
        selectedGroupSection: PropTypes.string.isRequired,
        selectedGroupKey: PropTypes.string.isRequired
    };

    state = {
        activeGroupIndex: null
    };

    onGroupChange = (index) => {
        const {groupedTests, selectedGroupSection, selectedGroupKey} = this.props;
        const activeGroupIndex = this.state.activeGroupIndex === index ? null : index;
        const isActive = activeGroupIndex !== null;

        this.setState({activeGroupIndex}, () => {
            const groups = groupedTests[selectedGroupSection].byKey[selectedGroupKey];
            const {browserIds = [], resultIds = []} = isActive ? groups[index] : {};

            this.props.actions.toggleTestsGroup({browserIds, resultIds, isActive});
        });
    }

    render() {
        const {groupedTests, selectedGroupSection, selectedGroupKey} = this.props;
        const groups = groupedTests[selectedGroupSection].byKey[selectedGroupKey];

        const {activeGroupIndex} = this.state;

        if (groups.length === 0) {
            const msg = `No tests match the key "${selectedGroupKey}" in the section "${selectedGroupSection}". `
                + `Try to clear "Group by" to see more results.`;

            return <div className="grouped-tests">{msg}</div>;
        }

        return <div className="grouped-tests">
            {groups.map((group, ind) => {
                const isActive = ind === activeGroupIndex;

                return <GroupTestsItem
                    key={group.name}
                    group={group}
                    isActive={isActive}
                    onClick={() => this.onGroupChange(ind)}
                />;
            })}
        </div>;
    }
}

export default connect(
    (state) => {
        const [selectedGroupSection, selectedGroupKey] = getParsedKeyToGroupTestsBy(state);

        return {groupedTests: state.groupedTests, selectedGroupSection, selectedGroupKey};
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(GroupTestsList);
