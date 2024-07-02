'use strict';

import React from 'react';
import {Checkbox} from 'semantic-ui-react';
import useLocalStorage from '../../hooks/useLocalStorage';
import { Switch } from '@gravity-ui/uikit';

const ShowCheckboxesInput = () => {
    const [showCheckboxes, setShowCheckboxes] = useLocalStorage('showCheckboxes', false);

    const onChange = () => setShowCheckboxes(!showCheckboxes);

    return (
        <Switch content="Checkboxes" onChange={onChange} checked={showCheckboxes}/>
    );
};

export default ShowCheckboxesInput;
