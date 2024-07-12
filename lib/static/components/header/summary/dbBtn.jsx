import React from 'react';
import PropTypes from 'prop-types';
import {Ref} from 'semantic-ui-react';
import classNames from 'classnames';
import { Button, ButtonIcon } from '@gravity-ui/uikit';
import {ChevronDown} from '@gravity-ui/icons';

const DbBtn = ({fetchDbDetails}, ref) => {
    const successFetchDbDetails = fetchDbDetails.filter(d => d.success);
    const isFailed = successFetchDbDetails.length !== fetchDbDetails.length;
    const value = `${successFetchDbDetails.length}/${fetchDbDetails.length}`;
    const content = `Databases loaded: ${value}`;

    return (
        <Ref innerRef={ref}>
            <Button
                view={isFailed ? 'flat-danger' : 'flat'}
            >
                <div className='db-info'>
                    <ChevronDown/>
                    {content}
                </div>
            </Button>
        </Ref>
    );
};

const ForwardedDbBtn = React.forwardRef(DbBtn);

ForwardedDbBtn.propTypes = {
    fetchDbDetails: PropTypes.arrayOf(PropTypes.shape({
        success: PropTypes.bool
    })).isRequired
};

export default ForwardedDbBtn;
