'use strict';

import {extend, isNumber} from 'lodash';
import React from 'react';
import {connect} from 'react-redux';

import {getVisibleRootSuiteIds} from '../../modules/selectors/tree';

const BottomProgressBar = (props) => {
    const {progressBar: {currentRootSuiteId}, visibleRootSuiteIds} = props;
    const suiteIdsIndexMap = React.useMemo(
        () => visibleRootSuiteIds.reduce((map, suiteId, idx) => extend(map, {[suiteId]: idx}), {}),
        [visibleRootSuiteIds]
    );
    const currentRootSuiteIdx = suiteIdsIndexMap[currentRootSuiteId];
    const percent = 100 / (visibleRootSuiteIds.length - 1) * currentRootSuiteIdx;

    if (!isNumber(currentRootSuiteIdx)) {
        return null;
    }

    return (
        <div className="bottom-progress-bar">
            <div className='bottom-progress-bar__progress-container'>
                <div className='bottom-progress-bar__progress-bar' style={{width: `${percent}%`}}></div>
                <div className='bottom-progress-bar__counter'>
                    {currentRootSuiteId}
                    <span>
                        {' '}(<strong>{currentRootSuiteIdx + 1}</strong> suite of <strong>{visibleRootSuiteIds.length}</strong>)
                    </span>
                </div>
            </div>
        </div>
    );
};

export default connect(
    (state) => ({
        progressBar: state.progressBar,
        visibleRootSuiteIds: getVisibleRootSuiteIds(state)
    }),
)(BottomProgressBar);
