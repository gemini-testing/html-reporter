'use strict';

import React, {Component} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import SummaryKey from './item';
import DbSummaryKey from './dbSummary';
import {getStats} from '../../../modules/utils';

class Summary extends Component {
    static propTypes = {
        stats: PropTypes.shape({
            total: PropTypes.number,
            passed: PropTypes.number,
            failed: PropTypes.number,
            skipped: PropTypes.number,
            retries: PropTypes.number
        })
    };

    render() {
        const {total, passed, failed, skipped, retries} = this.props.stats;
        const {useSqlite, dbStats} = this.props;
        return (
            <dl className="summary">
                <SummaryKey label="Total Tests" value={total}/>
                <SummaryKey label="Passed" value={passed}/>
                <SummaryKey label="Failed" value={failed} isFailed={true}/>
                <SummaryKey label="Skipped" value={skipped}/>
                <SummaryKey label="Retries" value={retries}/>
                {useSqlite ? <DbSummaryKey stats={dbStats}/> : null}
            </dl>
        );
    }
}

export default connect(
    (state) => {
        const {stats} = state;
        const {filteredBrowsers} = state.view;
        const statsToShow = getStats(stats, filteredBrowsers);

        return {
            stats: statsToShow,
            useSqlite: state.saveFormat === 'sqlite',
            dbStats: state.dbStats
        };
    })(Summary);
