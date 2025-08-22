import {SegmentedRadioGroup as RadioButton} from '@gravity-ui/uikit';
import React, {ReactNode} from 'react';
import classNames from 'classnames';

import {TestStatus, ViewMode} from '@/constants';
import styles from './index.module.css';

interface TabsSelectOptionProps {
    status: TestStatus | ViewMode.ALL;
    count: number;
    icon?: ReactNode;
    title: string;
}

const TabsSelectOption = ({count, icon, title}: TabsSelectOptionProps): ReactNode => (
    <div className={styles['test-status-filter-option']}>
        {!icon ? <span>{title}</span> : icon}<span className={styles['test-status-filter-option__count']}>{count}</span>
    </div>
);

export interface TabsSelectItem {
    title: string;
    value: ViewMode;
    count: number;
    icon?: ReactNode;
}

export interface TabsSelectProps {
    list: TabsSelectItem[];
    value: string;
    onChange: (value: string) => void;
    disabled: boolean;
    className?: string;
}

export function TabsSelect({list, value, onChange, disabled, className}: TabsSelectProps): ReactNode {
    return (
        <RadioButton
            disabled={disabled}
            className={classNames(styles.testStatusFilter, className)}
            width={'max'}
            value={value}
            onChange={(e): void => onChange(e.target.value)}
        >
            {list.map(({title, value, count, icon}) => (
                <RadioButton.Option
                    key={value}
                    title={title}
                    value={value}
                    content={<TabsSelectOption status={ViewMode.ALL} count={count} title={title} icon={icon} />}
                />
            ))}
        </RadioButton>
    );
}
