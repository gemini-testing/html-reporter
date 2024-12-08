import {
    ArrowRotateLeft,
    BarsAscendingAlignLeftArrowUp,
    BarsDescendingAlignLeftArrowDown,
    FontCase,
    SquareLetterT
} from '@gravity-ui/icons';
import {Icon, Select, SelectProps} from '@gravity-ui/uikit';
import React, {ReactNode} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {SortByExpression, SortDirection, SortType} from '@/static/new-ui/types/store';
import {setCurrentSortByExpression, setSortByDirection} from '@/static/modules/actions/sort-tests';
import {AdaptiveSelect} from '@/static/new-ui/components/AdaptiveSelect';
import styles from './index.module.css';

const getSortIcon = (sortByExpression: SortByExpression): ReactNode => {
    let iconData;
    switch (sortByExpression.type) {
        case SortType.ByName:
            iconData = FontCase;
            break;
        case SortType.ByFailedRuns:
            iconData = ArrowRotateLeft;
            break;
        case SortType.ByTestsCount:
            iconData = SquareLetterT;
            break;
    }
    return <Icon data={iconData} className={styles.optionIcon} width={14} height={14} />;
};

export function SortBySelect(): ReactNode {
    const dispatch = useDispatch();

    const sortByExpressionId = useSelector((state) => state.app.sortTestsData.currentExpressionIds)[0];
    const currentDirection = useSelector((state) => state.app.sortTestsData.currentDirection);

    const onOptionClick = (newExpressionId: string): void => {
        if (sortByExpressionId !== newExpressionId) {
            dispatch(setCurrentSortByExpression({expressionIds: [newExpressionId]}));
        } else {
            dispatch(setSortByDirection({direction: currentDirection === SortDirection.Asc ? SortDirection.Desc : SortDirection.Asc}));
        }
    };

    const onSetDirection = (direction: SortDirection): void => {
        if (currentDirection !== direction) {
            dispatch(setSortByDirection({direction}));
        }
    };

    const options: SelectProps['children'] = [
        <Select.OptionGroup label={'Sort by'} key={'sort-by'}>
            {useSelector(state => state.app.sortTestsData.availableExpressions)
                .map((expr, index): React.JSX.Element => (
                    <Select.Option key={index} title={expr.label}
                        content={<div className={styles.optionContent} onClick={(): void => onOptionClick(expr.id)}>
                            {getSortIcon(expr)}
                            <span className={styles.optionText}>{expr.label}</span>
                        </div>} value={expr.id}/>))
            }
        </Select.OptionGroup>,
        <Select.OptionGroup label={'Direction'} key={'sort-direction'}>
            <Select.Option value={SortDirection.Asc} content={<div className={styles.optionContent} onClick={(): void => onSetDirection(SortDirection.Asc)}>
                <Icon className={styles.optionIcon} data={BarsAscendingAlignLeftArrowUp} width={14} height={14} />
                <span className={styles.optionText}>Ascending</span>
            </div>}/>
            <Select.Option value={SortDirection.Desc} content={<div className={styles.optionContent} onClick={(): void => onSetDirection(SortDirection.Desc)}>
                <Icon className={styles.optionIcon} data={BarsDescendingAlignLeftArrowDown} width={14} height={14} />
                <span className={styles.optionText}>Descending</span>
            </div>}/>
        </Select.OptionGroup>
    ];

    return <AdaptiveSelect
        label={'Sort by'}
        labelIcon={<Icon data={currentDirection === SortDirection.Asc ? BarsAscendingAlignLeftArrowUp : BarsDescendingAlignLeftArrowDown} />}
        currentValue={[sortByExpressionId, currentDirection]}
        autoClose={false}
        multiple={true}
    >
        {options}
    </AdaptiveSelect>;
}
