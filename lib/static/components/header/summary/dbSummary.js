'use strict';

import React, {Component, Fragment} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export default class DbSummaryKey extends Component {
    /*
        Component to display the amount of fetched databases (and response statuses of all databases)
     */
    static propTypes = {
        stats: PropTypes.object
    };
    state = {
        collapsed: true
    };

    _showDatabases = () => {
        this.setState({collapsed: false});
    };

    _collapseDatabases = () => {
        this.setState({collapsed: true});
    };

    render() {
        if (!this.props.stats) {
            return null;
        }
        const {expected, fetched, dbs} = this.props.stats;
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
                {dbs.map(db =>
                    <p key={db.url}> <span className="db-fetch__url"> {db.url}
                    </span> responded with <span
                        className={db.response === 200 ? 'db-fetch__success' : 'db-fetch__fail'}>{db.response}</span>
                    </p>
                )}
            </div>;
        return (
            <Fragment>
                <div className={divClassName} onMouseEnter={this._showDatabases} onMouseLeave={this._collapseDatabases}>
                    <dt className={className}>Databases loaded</dt>
                    <dd className="summary__value">{value}</dd>
                    {additionalInfo}
                </div>
            </Fragment>
        );
    }
}
