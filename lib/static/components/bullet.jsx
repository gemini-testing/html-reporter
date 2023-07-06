import React from 'react';
import classNames from 'classnames';
import {Checkbox} from 'semantic-ui-react';
import PropTypes from 'prop-types';
import {isCheckboxChecked, isCheckboxIndeterminate} from '../../common-utils';
import {CHECKED, INDETERMINATE, UNCHECKED} from '../../constants/checked-statuses';
import useLocalStorage from '../hooks/useLocalStorage';

const Bullet = ({status, onClick, className}) => {
    const [isCheckbox] = useLocalStorage('showCheckboxes', false);

    if (!isCheckbox) {
        return <span className={classNames('bullet_type-simple', className)} />;
    }

    return <Checkbox
        className={classNames('bullet_type-checkbox', className)}
        checked={isCheckboxChecked(status)}
        indeterminate={isCheckboxIndeterminate(status)}
        onClick={onClick}
    />;
};

Bullet.propTypes = {
    status: PropTypes.oneOf([CHECKED, UNCHECKED, INDETERMINATE]),
    onClick: PropTypes.func,
    bulletClassName: PropTypes.string
};

export default Bullet;
