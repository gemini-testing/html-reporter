import React, {Component} from 'react';
import {Dropdown} from 'semantic-ui-react';
import PropTypes from 'prop-types';

import DbBtn from './dbBtn';
import {Popover} from '@gravity-ui/uikit';

export default class DbSummaryKey extends Component {
    /*
        Component to display the amount of fetched databases (and response statuses of all databases).
        Used when building a report using data from sqlite databases.
     */
    static propTypes = {
        fetchDbDetails: PropTypes.arrayOf(PropTypes.shape({
            url: PropTypes.string,
            status: PropTypes.number,
            success: PropTypes.bool
        })).isRequired
    };
    state = {
        collapsed: true
    };

    render() {
        const {fetchDbDetails} = this.props;

        if (!fetchDbDetails) {
            return null;
        }

        const additionalInfo = fetchDbDetails.map(({url, status, success}) => (
            <Dropdown.Item key={url} className="db-info__row">
                {' '}
                {url} responded with
                <span className={success ? 'db-info__row_success' : 'db-info__row_fail'}>{' ' + status}</span>
            </Dropdown.Item>
        ));

        return (
            <div className='db-info-container'>
                <Popover
                    disablePortal
                    placement={'bottom'}
                    content={
                        additionalInfo
                    }
                >
                    <DbBtn fetchDbDetails={fetchDbDetails} />
                </Popover>
            </div>
        );
    }
}
