'use strict';

import React, {Component} from 'react';
import TestNameFilterInput from './test-name-filter-input';
import StrictMatchFilterInput from './strict-match-filter-input';

class CommonFilters extends Component {
    render() {
        return (
            <div className="control-filters">
                <TestNameFilterInput/>
                <StrictMatchFilterInput/>
            </div>
        );
    }
}

export default CommonFilters;
