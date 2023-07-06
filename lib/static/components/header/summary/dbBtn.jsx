import React from 'react';
import PropTypes from 'prop-types';
import {Ref, Button} from 'semantic-ui-react';
import classNames from 'classnames';

const DbBtn = ({fetchDbDetails}, ref) => {
    const successFetchDbDetails = fetchDbDetails.filter(d => d.success);
    const isFailed = successFetchDbDetails.length !== fetchDbDetails.length;
    const value = `${successFetchDbDetails.length}/${fetchDbDetails.length}`;
    const content = `Databases loaded: ${value}`;
    const className = classNames(
        'db-info',
        {'db-info_failed': isFailed}
    );

    return (
        <Ref innerRef={ref}>
            <Button
                content={content}
                icon="angle down"
                className={className}
                basic
            />
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
