import React from 'react';
import PropTypes from 'prop-types';
import {Ref} from 'semantic-ui-react';
import {Button} from '@gravity-ui/uikit';
import {ChevronDown} from '@gravity-ui/icons';

const ForwardedDbBtn = React.forwardRef(function DbBtn({fetchDbDetails}, ref) {
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
});

ForwardedDbBtn.propTypes = {
    fetchDbDetails: PropTypes.arrayOf(PropTypes.shape({
        success: PropTypes.bool
    })).isRequired
};

export default ForwardedDbBtn;
