import {Button, ButtonProps} from '@gravity-ui/uikit';
import React, {ReactNode} from 'react';
import classNames from 'classnames';
import {connect} from 'react-redux';

import {hasUnrelatedToScreenshotsErrors, isFailStatus} from '@/common-utils';
import {TestStatus} from '@/constants';
import {ResultEntityError, State} from '@/static/new-ui/types/store';
import styles from './index.module.css';

const getButtonStyleByStatus = (status: TestStatus): Pick<ButtonProps, 'view' | 'selected'> => {
    switch (status) {
        case TestStatus.SUCCESS:
            return {
                view: 'flat-success',
                selected: true
            };
        case TestStatus.UPDATED:
            return {
                view: 'flat-success',
                selected: true
            };
        case TestStatus.ERROR:
            return {
                view: 'flat-danger',
                selected: true
            };
        case TestStatus.FAIL:
            return {
                view: 'flat-utility',
                selected: true
            };
            // eslint-disable-next-line camelcase
        case TestStatus.FAIL_ERROR:
            return {
                view: 'flat-utility',
                selected: true
            };
        case TestStatus.SKIPPED:
            return {
                view: 'normal',
                selected: false
            };
        case TestStatus.RUNNING:
            return {
                view: 'outlined',
                selected: false
            };
        default:
            return {
                view: 'flat',
                selected: false
            };
    }
};

export interface AttemptPickerItemProps {
    resultId: string;
    isActive?: boolean;
    onClick?: () => unknown;
    title?: string;
}

interface AttemptPickerItemInternalProps extends AttemptPickerItemProps{
    status: TestStatus;
    attempt: number;
    currentGroupId: string | null;
    matchedSelectedGroup: boolean;
}

function AttemptPickerItemInternal(props: AttemptPickerItemInternalProps): ReactNode {
    const {status, attempt, isActive, onClick, title, matchedSelectedGroup} = props;
    const buttonStyle = getButtonStyleByStatus(status);

    const className = classNames(
        styles.attemptPickerItem,
        {[styles['attempt-picker-item--active']]: isActive},
        {[styles[`attempt-picker-item--${status}`]]: status},
        {[styles['attempt-picker-item--non-matched']]: props.currentGroupId && !matchedSelectedGroup}
    );

    return <Button {...buttonStyle} title={title} className={className} onClick={onClick} qa={'retry-switcher'}>{attempt + 1}</Button>;
}

export const AttemptPickerItem = connect(
    ({tree, app: {suitesPage: {currentGroupId}}}: State, {resultId}: AttemptPickerItemProps) => {
        const result = tree.results.byId[resultId];
        const group = Object.values(tree.groups.byId).find(group => group.id === currentGroupId);
        const matchedSelectedGroup = Boolean(group?.resultIds.includes(resultId));
        const {status, attempt} = result;

        return {
            status: isFailStatus(result.status) && hasUnrelatedToScreenshotsErrors((result as ResultEntityError).error) ? TestStatus.FAIL_ERROR : status,
            attempt,
            currentGroupId,
            matchedSelectedGroup
        };
    }
)(AttemptPickerItemInternal);
