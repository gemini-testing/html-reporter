'use-strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';

export default class DbStats extends Component {
    static propTypes = {
        stats: PropTypes.object
    };
    state = {
        opened: false
    };

    _onToggleSection = () => {
        this.setState({opened: !this.state.opened});
    };

    render() {
        const {expected, fetched, dbs} = this.props.stats;
        const additionalInfo = this.state.opened ?
            <div>
                {dbs.map(db =>
                    <p className="db-fetch__item" key={db.url}> {db.url} {db.fetched ?
                        <span className="db-fetch__success">Success</span> :
                        <span className="db-fetch__fail">Fail</span>}</p>
                )}
            </div> : null;

        return (
            <div className="db-fetch__body">
                <p onClick={this._onToggleSection} className={expected === fetched ? 'db-fetch__success' : 'db-fetch__fail'}>{fetched}/{expected} databases were loaded</p>
                {additionalInfo}
            </div>
        );
    }
}
