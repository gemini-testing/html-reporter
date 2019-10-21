'use strict';

import React, {Component, Fragment} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

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
            'summary__db_key',
            {'summary__key_has-fails': isFailed}
        );
        const divClassName = classNames(
            'summary__db_body',
            {'dbs_collapsed': this.state.collapsed}
        );
        const value = fetched + '/' + expected;

        const additionalInfo = this.state.collapsed ? null :
            <div>
                {fetchDetails.map(file =>
                    <p key={file.url}> <span className="db-fetch__url"> {file.url}
                    </span> responded with <span
                        className={file.response === 200 ? 'db-fetch__success' : 'db-fetch__fail'}>{file.response}</span>
                    </p>
                )}
            </div>;
        return (
            <Fragment>
                <div className={divClassName}>
                    <dt className={className} onClick={this._toggleDatabases}>Databases loaded</dt>
                    <dd className="summary__value">{value}</dd>
                    {additionalInfo}
                </div>
            </Fragment>
        );
    }
}
