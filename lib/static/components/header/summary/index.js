'use strict';

import React, {Component} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import SummaryKey from './item';
import {getStats} from '../../../modules/utils';

class Summary extends Component {
    static propTypes = {
        stats: PropTypes.shape({
            total: PropTypes.number.isRequired,
            passed: PropTypes.number.isRequired,
            failed: PropTypes.number.isRequired,
            skipped: PropTypes.number.isRequired,
            retries: PropTypes.number.isRequired
        })
    }

    render() {
        const {total, passed, failed, skipped, retries} = this.props.stats;

        return (
            <dl className="summary">
                <SummaryKey label="Total Tests" value={total}/>
                <SummaryKey label="Passed" value={passed}/>
                <SummaryKey label="Failed" value={failed} isFailed={true}/>
                <SummaryKey label="Skipped" value={skipped}/>
                <SummaryKey label="Retries" value={retries}/>
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
            stats: statsToShow
        };
    })(Summary);
