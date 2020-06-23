'use strict';

import React, {Component} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import SummaryKey from './item';
import DbSummaryKey from './dbSummary';
import {getStats} from '../../../modules/utils';

import './summary.css';

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
        const {fetchDbDetails} = this.props;

        return (
            <dl className="summary">
                <SummaryKey label="Total Tests" id="total" value={total} />
                <SummaryKey label="Passed" id="passed" value={passed} />
                <SummaryKey label="Failed" id="failed" value={failed} />
                <SummaryKey label="Retries" id="retries" value={retries} />
                <SummaryKey label="Skipped" id="skipped" value={skipped} />
                <DbSummaryKey fetchDbDetails={fetchDbDetails} />
            </dl>
        );
    }
}

export default connect(
    ({reporter: state}) => {
        const {stats} = state;
        const {filteredBrowsers} = state.view;
        const statsToShow = getStats(stats, filteredBrowsers);

        return {
            stats: statsToShow,
            fetchDbDetails: state.fetchDbDetails
        };
    })(Summary);
