'use strict';

import React, {Component} from 'react';
import {connect} from 'react-redux';
import SummaryKey from './item';

interface ISummaryProps {
    stats: {
        total: number;
        passed: number;
        failed: number;
        skipped: number;
        retries: number;
    };
}

class Summary extends Component<ISummaryProps> {

    render() {
        const {total, passed, failed, skipped, retries} = this.props.stats;

        return (
            <dl className='summary'>
                <SummaryKey label='Total Tests' value={total}/>
                <SummaryKey label='Passed' value={passed}/>
                <SummaryKey label='Failed' value={failed} isFailed={true}/>
                <SummaryKey label='Skipped' value={skipped}/>
                <SummaryKey label='Retries' value={retries}/>
            </dl>
        );
    }
}

export default connect<ISummaryProps>((state: ISummaryProps) => ({
    stats: state.stats
}))(Summary);
