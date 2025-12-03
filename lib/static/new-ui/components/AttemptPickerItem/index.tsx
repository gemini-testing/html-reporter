import {Button, ButtonProps} from '@gravity-ui/uikit';
import React, {ReactNode} from 'react';
import classNames from 'classnames';
import {useSelector} from 'react-redux';

import {hasUnrelatedToScreenshotsErrors, isFailStatus} from '@/common-utils';
import {TestStatus} from '@/constants';
import {GroupEntity, ResultEntityError, State} from '@/static/new-ui/types/store';
import styles from './index.module.css';
import {get} from 'lodash';

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

export const AttemptPickerItem = (props: AttemptPickerItemProps): ReactNode => {
    const {isActive, onClick, title, resultId} = props;
    const result = useSelector((state) => state.tree.results.byId[resultId]);

    const matchedSelectedGroup = useSelector(({tree, app: {isNewUi, suitesPage: {currentGroupId}}}: State) => {
        const group = tree.groups.byId[currentGroupId ?? ''] as GroupEntity | undefined;
        return isNewUi ?
            Boolean(group?.resultIds.includes(resultId)) :
            get(tree.results.stateById[resultId], 'matchedSelectedGroup', false);
    });

    const isGroupingEnabled = useSelector(({view: {keyToGroupTestsBy}, app: {isNewUi, suitesPage: {currentGroupId}}}: State) => isNewUi ? Boolean(currentGroupId) : Boolean(keyToGroupTestsBy));

    const status = isFailStatus(result.status) && hasUnrelatedToScreenshotsErrors((result as ResultEntityError).error) ? TestStatus.FAIL_ERROR : result.status;

    const buttonStyle = getButtonStyleByStatus(status);

    if (!result) {
        return null;
    }

    const className = classNames(
        styles.attemptPickerItem,
        {[styles['attempt-picker-item--active']]: isActive},
        {[styles[`attempt-picker-item--${status}`]]: status},
        {[styles['attempt-picker-item--non-matched']]: isGroupingEnabled && !matchedSelectedGroup}
    );

    return <Button {...buttonStyle} title={title} className={className} onClick={onClick} qa={'retry-switcher'} data-qa-active={isActive}>{result.attempt + 1}</Button>;
};
