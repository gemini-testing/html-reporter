import React from 'react';
import PropTypes from 'prop-types';

import {buildComplexId} from './utils';

import './label.styl';

const Label = ({treeDataMap, browserId, version, elements, setSelected}) => {
    const id = buildComplexId(browserId, version);
    const isChildren = key => !version && treeDataMap[key].browserId === browserId;
    const getLeaves = () => Object.keys(treeDataMap).filter(key => treeDataMap[key].isLeaf);

    const onOnlyClick = (event) => {
        event.stopPropagation();

        const leaves = getLeaves();
        const ids = leaves.includes(id)
            ? [id]
            : leaves.filter(key => isChildren(key));

        setSelected(ids);
    };

    const onExceptClick = (event) => {
        event.stopPropagation();

        const leaves = getLeaves();
        const ids = leaves.includes(id)
            ? leaves.filter(key => key !== id)
            : leaves.filter(key => !isChildren(key));

        setSelected(ids);
    };

    return (
        <span className='rct-label'>
            <span className='rct-label__title'>{version || browserId}</span>
            {elements && elements.length === 1 && elements[0] === id
                ? <button className='rct-label__controls' onClick={onExceptClick}>Except</button>
                : <button className='rct-label__controls' onClick={onOnlyClick}>Only</button>
            }
        </span>
    );
};

Label.propTypes = {
    treeDataMap: PropTypes.shape({
        [PropTypes.string]: PropTypes.shape({
            browserId: PropTypes.string.isRequired,
            version: PropTypes.string,
            isLeaf: PropTypes.bool.isRequired
        })
    }),
    browserId: PropTypes.string.isRequired,
    version: PropTypes.string,
    elements: PropTypes.arrayOf(PropTypes.string),
    setSelected: PropTypes.func.isRequired
};

export default Label;
