'use strict';

import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as actions from '../../modules/actions';
import TestNameFilterInput from './test-name-filter-input';
import StrictMatchFilterInput from './strict-match-filter-input';
import BrowserList from './browser-list';

class CommonFilters extends Component {
    render() {
        const {filteredBrowsers, browsers, actions} = this.props;

        return (
            <div className="control-filters">
                <BrowserList
                    available={browsers}
                    selected={filteredBrowsers}
                    onChange={actions.selectBrowsers}
                />
                <TestNameFilterInput/>
                <StrictMatchFilterInput/>
            </div>
        );
    }
}

export default connect(
    ({view, browsers}) => ({filteredBrowsers: view.filteredBrowsers, browsers}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(CommonFilters);
