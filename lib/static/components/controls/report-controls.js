'use strict';
import React, {Component} from 'react';
import CommonControls from './common-controls';
import CommonFilters from './common-filters';

import './controls.less';

class ReportControls extends Component {
    render() {
        return (
            <div className="main-menu container">
                <div className="control-buttons">
                    <CommonControls />
                </div>
                <CommonFilters />
            </div>
        );
    }
}

export default ReportControls;
