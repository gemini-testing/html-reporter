'use strict';

import React, {Component} from 'react';
import FilterByNameInput from './filter-by-name-input';

class CommonFilters extends Component {
    render() {
        return (
            <div className="control-filters">
                <FilterByNameInput/>
            </div>
        );
    }
}

export default CommonFilters;
