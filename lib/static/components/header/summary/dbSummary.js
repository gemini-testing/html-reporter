'use strict';

import React, {Component} from 'react';
import {Dropdown} from 'semantic-ui-react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import 'semantic-ui-css/components/dropdown.min.css';

export default class DbSummaryKey extends Component {
    /*
        Component to display the amount of fetched databases (and response statuses of all databases).
        Used when building a report using data from sqlite databases.
     */
    static propTypes = {
        fetchDbDetails: PropTypes.array
    };
    state = {
        collapsed: true
    };

    _toggleDatabases = () => {
        this.setState({collapsed: !this.state.collapsed});
    };

    render() {
        const {fetchDbDetails} = this.props;

        if (!fetchDbDetails) {
            return null;
        }

        const successFetchDbDetails = fetchDbDetails.filter(d => d.success);
        const isFailed = successFetchDbDetails.length !== fetchDbDetails.length;
        const className = classNames('summary__key', {'summary__key_has-fails': isFailed});
        const value = `${successFetchDbDetails.length}/${fetchDbDetails.length}`;

        const additionalInfo = fetchDbDetails.map(({url, status, success}) => (
            <Dropdown.Item key={url} className="db-info__row">
                {' '}
                {url} responded with
                <span className={success ? 'db-info__success' : 'db-info__fail'}>{' ' + status}</span>
            </Dropdown.Item>
        ));

        return (
            <React.Fragment>
                <dt className={className}>
                    <Dropdown className="db-info" text="Databases loaded " icon="dropdown" simple direction="right">
                        <Dropdown.Menu>{additionalInfo}</Dropdown.Menu>
                    </Dropdown>
                </dt>
                <dd className="summary__value">{value}</dd>
            </React.Fragment>
        );
    }
}
