import {ArrowRotateLeft, ArrowsRotateLeft, Ban, Check, CircleDashed, CloudCheck, Xmark} from '@gravity-ui/icons';
import {ControlGroupOption, RadioButton} from '@gravity-ui/uikit';
import React from 'react';
import {connect} from 'react-redux';
import {getStatsFilteredByBrowsers} from '../../../../modules/selectors/stats';

interface StatusFilterInternalProps {
    stats: {
        total: number;
        passed: number;
        failed: number;
        skipped: number;
        retries: number;
    },
}

function StatusFilterInternal(props: StatusFilterInternalProps): JSX.Element {
    const statusToIcon = {
        total: <CircleDashed/>,
        passed: <Check/>,
        failed: <Xmark/>,
        retried: <ArrowRotateLeft/>,
        skipped: <Ban/>,
        updated: <ArrowsRotateLeft/>,
        commited: <CloudCheck/>
    } as const;

    const options: ControlGroupOption[] = Object.entries(props.stats)
        .filter(([status, count]) => count > 0 || status === 'total')
        .map(([status, count]) => ({
            value: status,
            content: <div className="status-switcher__option">{statusToIcon[status as keyof typeof statusToIcon]}<span>{count}</span></div>
        }));

    return <RadioButton className="status-switcher" width={'max'} options={options}></RadioButton>;
}

export const StatusFilter = connect(
    (state) => ({
        stats: getStatsFilteredByBrowsers(state)
    })
)(StatusFilterInternal);
