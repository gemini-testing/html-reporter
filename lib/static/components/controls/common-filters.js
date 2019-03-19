'use strict';

import React, {Component} from 'react';
import TestNameFilterInput from './test-name-filter-input';

class CommonFilters extends Component {
    render() {
        return (
            <div className="control-filters">
                <TestNameFilterInput/>
            </div>
        );
    }
}

export default CommonFilters;
