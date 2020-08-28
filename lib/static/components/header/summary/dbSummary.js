import React, {Component} from 'react';
import {Dropdown, Popup, Button} from 'semantic-ui-react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

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
        const value = `${successFetchDbDetails.length}/${fetchDbDetails.length}`;
        const additionalInfo = fetchDbDetails.map(({url, status, success}) => (
            <Dropdown.Item key={url} className="db-info__row">
                {' '}
                {url} responded with
                <span className={success ? 'db-info__row_success' : 'db-info__row_fail'}>{' ' + status}</span>
            </Dropdown.Item>
        ));
        const title = `Databases loaded: ${value}`;
        const btnClassNames = classNames(
            'db-info',
            {'db-info_failed': isFailed}
        );

        return (
            <Popup
                trigger={<Button
                    content={title}
                    icon="angle down"
                    className={btnClassNames}
                    basic
                />}
                position="bottom center"
                flowing
                wide
                hoverable
            >
                {additionalInfo}
            </Popup>
        );
    }
}
