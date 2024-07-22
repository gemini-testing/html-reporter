'use strict';

import React from 'react';
import useLocalStorage from '../../hooks/useLocalStorage';
import {Switch} from '@gravity-ui/uikit';

const ShowCheckboxesInput = () => {
    const [showCheckboxes, setShowCheckboxes] = useLocalStorage('showCheckboxes', false);

    const onChange = () => setShowCheckboxes(!showCheckboxes);

    return (
        <Switch content="Checkboxes" onChange={onChange} checked={showCheckboxes}/>
    );
};

export default ShowCheckboxesInput;
