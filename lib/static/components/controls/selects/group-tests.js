import React, {Component, Fragment} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {Label, Dropdown} from 'semantic-ui-react';
import classNames from 'classnames';
import {isEmpty} from 'lodash';

import * as actions from '../../../modules/actions';
import {groupedTestsType} from '../../group-tests/prop-types';
import {SECTIONS, KEY_DELIMITER} from '../../../../constants/group-tests';
import {getParsedKeyToGroupTestsBy} from '../../../modules/selectors/grouped-tests';

import './index.styl';

class GroupTestsSelect extends Component {
    static propTypes = {
        actions: PropTypes.object.isRequired,
        // from store
        keyToGroupTestsBy: PropTypes.string.isRequired,
        groupedTests: groupedTestsType.isRequired,
        selectedGroupSection: PropTypes.string,
        selectedGroupKey: PropTypes.string
    }

    _groupTestsByKey = (_, dom) => {
        if (dom.value !== this.props.keyToGroupTestsBy) {
            this.props.actions.groupTestsByKey(dom.value);
        }
    }

    _renderSection(sectionName) {
        const {groupedTests} = this.props;
        const keys = groupedTests[sectionName].allKeys;

        if (isEmpty(keys)) {
            return null;
        }

        return (
            <Fragment key={sectionName}>
                <Dropdown.Divider/>
                <Dropdown.Header content={sectionName} />
                <Dropdown.Divider/>
                {keys.map(key => {
                    const id = getGroupElemId(sectionName, key);
                    const isActive = id === this.props.keyToGroupTestsBy;

                    return <Dropdown.Item key={id} value={id} active={isActive} onClick={this._groupTestsByKey}>{key}</Dropdown.Item>;
                })}
            </Fragment>
        );
    }

    render() {
        const {selectedGroupKey} = this.props;
        const className = classNames(
            'select',
            'select_type_group'
        );

        return (
            <div className={className}>
                <Label className="select__label">Group by</Label>
                <Dropdown
                    className="select__dropdown selection"
                    value={selectedGroupKey}
                    text={selectedGroupKey}
                    onChange={this._groupTestsByKey}
                    placeholder="select key"
                    clearable={Boolean(selectedGroupKey)}
                >
                    <Dropdown.Menu>
                        {Object.values(SECTIONS).map((sectionName) => this._renderSection(sectionName))}
                    </Dropdown.Menu>
                </Dropdown>
            </div>
        );
    }
}

export default connect(
    (state) =>{
        const {view: {keyToGroupTestsBy}, groupedTests} = state;
        const [selectedGroupSection, selectedGroupKey] = getParsedKeyToGroupTestsBy(state);

        return {keyToGroupTestsBy, groupedTests, selectedGroupSection, selectedGroupKey};
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(GroupTestsSelect);

function getGroupElemId(groupName, groupKey) {
    return `${groupName}${KEY_DELIMITER}${groupKey}`;
}
