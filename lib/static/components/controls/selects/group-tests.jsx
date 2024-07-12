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
import CustomLabel from './label';
import { Select } from '@gravity-ui/uikit';

class GroupTestsSelect extends Component {
    static propTypes = {
        actions: PropTypes.object.isRequired,
        // from store
        keyToGroupTestsBy: PropTypes.string.isRequired,
        groupedTests: groupedTestsType.isRequired,
        selectedGroupSection: PropTypes.string,
        selectedGroupKey: PropTypes.string
    };

    _groupTestsByKey = (values) => {
        const value = values ? values[0] : undefined;
        if (value !== this.props.keyToGroupTestsBy) {
            this.props.actions.groupTestsByKey(value);
        }
    };

    render() {
        const {selectedGroupKey, groupedTests} = this.props;
        const className = classNames(
            'select',
            'select_type_group'
        );
        const options = Object.values(SECTIONS).map((sectionName) => ({
            label: sectionName,
            options: groupedTests[sectionName].allKeys.map((k) => ({ value: `${sectionName}.${k}`, content: k}))
        }));

        return (
            <div className={className}>
                <CustomLabel size='m' pin='round-brick'>Group By</CustomLabel>
                <Select
                    className='group-by-dropdown'
                    options={options}
                    value={[selectedGroupKey]}
                    hasClear
                    onUpdate={this._groupTestsByKey}
                    pin='brick-round'
                    placeholder='select key'
                    qa='group-by-dropdown'
                    />
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
