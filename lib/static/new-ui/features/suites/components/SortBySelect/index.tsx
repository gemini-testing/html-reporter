import {
    ArrowDown,
    ArrowUp,
    BarsAscendingAlignLeftArrowDown,
    BarsDescendingAlignLeftArrowDown
} from '@gravity-ui/icons';
import {Icon, SelectOption} from '@gravity-ui/uikit';
import React, {ReactNode} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {SortDirection} from '@/static/new-ui/types/store';
import {setCurrentSortByExpression, setSortByDirection} from '@/static/modules/actions/sort-tests';
import {AdaptiveSelect} from '@/static/new-ui/components/AdaptiveSelect';
import styles from './index.module.css';

export function SortBySelect(): ReactNode {
    const dispatch = useDispatch();

    const sortByExpressionId = useSelector((state) => state.app.sortTestsData.currentExpressionIds)[0];
    const currentDirection = useSelector((state) => state.app.sortTestsData.currentDirection);

    const sortByExpressions = useSelector(state => state.app.sortTestsData.availableExpressions)
        .map((expr): SelectOption => ({content: expr.label, value: expr.id}));

    const onOptionClick = (newExpressionId: string): void => {
        if (sortByExpressionId !== newExpressionId) {
            dispatch(setCurrentSortByExpression({expressionIds: [newExpressionId]}));
        } else {
            dispatch(setSortByDirection({direction: currentDirection === SortDirection.Asc ? SortDirection.Desc : SortDirection.Asc}));
        }
    };

    const onClear = (): void => {
        dispatch(setCurrentSortByExpression({expressionIds: []}));
        dispatch(setSortByDirection({direction: SortDirection.Asc}));
    };

    return <AdaptiveSelect
        label={'Sort by'}
        labelIcon={<>
            <Icon data={ArrowUp} width={14}/>
            <Icon className={styles.labelIconRight} data={ArrowDown} width={14}/>
        </>}
        options={sortByExpressions}
        currentValue={sortByExpressionId}
        onClear={onClear}
        onOptionClick={onOptionClick}
        autoClose={false}
        currentOptionIcon={<>
            <Icon
                className={styles.currentOptionIcon}
                data={currentDirection === SortDirection.Desc ? BarsDescendingAlignLeftArrowDown : BarsAscendingAlignLeftArrowDown}/>
        </>}
    />;
}
