import React from 'react';

import './index.styl';

export default ({done, total, dataTestId}) => {
    const percent = (done / total).toFixed(2) * 100;

    return (
        <span className="progress-bar" data-content={`${done}/${total}`} data-test-id={dataTestId}>
            <span className="progress-bar__container" style={{width: `${percent}%`}}/>
        </span>
    );
};
