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
        stats: PropTypes.object
    };
    state = {
        collapsed: true
    };

    _toggleDatabases = () => {
        this.setState({collapsed: !this.state.collapsed});
    };

    render() {
        if (!this.props.stats) {
            return null;
        }
        const {expected, fetched, fetchDetails} = this.props.stats;
        const isFailed = fetched !== expected;

        const className = classNames(
            'summary__key',
            {'summary__key_has-fails': isFailed}
        );

        const value = `${fetched}/${expected}`;

        const additionalInfo = fetchDetails.map(file =>
            <Dropdown.Item key={file.url} className='db-info__row'> {file.url} responded with
                <span className={file.response === 200 ? 'db-info__success' : 'db-info__fail'}>
                    {' ' + file.response}
                </span>
            </Dropdown.Item>);

        return (

            <React.Fragment>
                <dt className={className}>
                    <Dropdown className="db-info" text="Databases loaded " icon="dropdown" simple direction="right">
                        <Dropdown.Menu>
                            {additionalInfo}
                        </Dropdown.Menu>
                    </Dropdown>
                </dt>
                <dd className="summary__value">{value}</dd>

            </React.Fragment>
        );
    }
}
