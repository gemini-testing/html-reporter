'use strict';
import React, {Component, Fragment} from 'react';
import CommonControls from './common-controls';
import CommonFilters from './common-filters';

class ReportControls extends Component {
    render() {
        return (
            <Fragment>
                <div className="control-buttons">
                    <CommonControls/>
                </div>
                <CommonFilters/>
            </Fragment>
        );
    }
}

export default ReportControls;
