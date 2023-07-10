'use strict';

import React from 'react';
import {Checkbox} from 'semantic-ui-react';
import useLocalStorage from '../../hooks/useLocalStorage';

const ShowCheckboxesInput = () => {
    const [showCheckboxes, setShowCheckboxes] = useLocalStorage('showCheckboxes', false);

    const onChange = () => setShowCheckboxes(!showCheckboxes);

    return (
        <div className="toggle-control">
            <Checkbox
                toggle
                label="Checkboxes"
                onChange={onChange}
                checked={showCheckboxes}
            />
        </div>
    );
};

export default ShowCheckboxesInput;
