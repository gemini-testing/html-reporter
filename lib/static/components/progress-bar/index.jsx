import React from 'react';
import PropTypes from 'prop-types';

import './index.styl';

const ProgressBar = ({done, total, dataTestId}) => {
    const percent = (done / total).toFixed(2) * 100;

    return (
        <span className="progress-bar" data-content={`${done}/${total}`} data-testid={dataTestId}>
            <span className="progress-bar__container" style={{width: `${percent}%`}}/>
        </span>
    );
};

ProgressBar.propTypes = {
    done: PropTypes.number.isRequired,
    total: PropTypes.number.isRequired,
    dataTestId: PropTypes.string
};

export default ProgressBar;
