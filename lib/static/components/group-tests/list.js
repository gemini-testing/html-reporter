import React, {Component} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {bindActionCreators} from 'redux';

import GroupTestsItem from './item';
import {groupedTestsType} from './prop-types';
import * as actions from '../../modules/actions';
import {getParsedGroupTestsByKey} from '../../modules/selectors/grouped-tests';

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
            const browserIds = isActive ? groups[index].browserIds : [];
            const resultIds = isActive ? groups[index].resultIds : [];

            this.props.actions.toggleTestsGroup({browserIds, resultIds, isActive});
        });
    }

    render() {
        const {groupedTests, selectedGroupSection, selectedGroupKey} = this.props;
        const groups = groupedTests[selectedGroupSection].byKey[selectedGroupKey];

        const {activeGroupIndex} = this.state;

        if (groups.length === 0) {
            const msg = `There are no tests matched by selected key: "${selectedGroupKey}" `
                + `in section: "${selectedGroupSection}". Try to clear "Group by" select.`;

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
        const [selectedGroupSection, selectedGroupKey] = getParsedGroupTestsByKey(state);

        return {groupedTests: state.groupedTests, selectedGroupSection, selectedGroupKey};
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(GroupTestsList);
