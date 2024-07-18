import React from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import {isCheckboxChecked, isCheckboxIndeterminate} from '../../common-utils';
import {CHECKED, INDETERMINATE, UNCHECKED} from '../../constants/checked-statuses';
import useLocalStorage from '../hooks/useLocalStorage';
import {Checkbox} from '@gravity-ui/uikit';
import {ChevronUp} from '@gravity-ui/icons';

const Bullet = ({status, onClick, className}) => {
    const [isCheckbox] = useLocalStorage('showCheckboxes', false);

    const handleClick = React.useCallback((e) => {
        e.stopPropagation();
        onClick(e);
    });

    if (!isCheckbox) {
        return <div className='bullet-container'><ChevronUp className={classNames(className, 'bullet_type-simple')}/></div>;
    }

    return <div onClick={handleClick} className='bullet-container'>
        <Checkbox
            className={classNames('bullet_type-checkbox', className)}
            checked={isCheckboxChecked(status)}
            indeterminate={isCheckboxIndeterminate(status)}
        />
    </div>;
};

Bullet.propTypes = {
    status: PropTypes.oneOf([CHECKED, UNCHECKED, INDETERMINATE]),
    onClick: PropTypes.func,
    bulletClassName: PropTypes.string
};

export default Bullet;
