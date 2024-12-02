import {Cubes3Overlap} from '@gravity-ui/icons';
import {Icon, SelectOptionGroup} from '@gravity-ui/uikit';
import React, {ReactNode} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {GroupByType} from '@/static/new-ui/types/store';
import {setCurrentGroupByExpression} from '@/static/modules/actions';
import {AdaptiveSelect} from '@/static/new-ui/components/AdaptiveSelect';

export function GroupBySelect(): ReactNode {
    const dispatch = useDispatch();

    const groupByExpressionId = useSelector((state) => state.app.groupTestsData.currentExpressionIds)[0];

    const groupBySections = useSelector((state) => state.app.groupTestsData.availableSections);
    const groupByExpressions = useSelector((state) => state.app.groupTestsData.availableExpressions);
    const groupByOptions = groupBySections
        .map((section): SelectOptionGroup => ({
            label: section.label,
            options: groupByExpressions.filter(expr => expr.sectionId === section.id).map(expr => {
                if (expr.type === GroupByType.Meta) {
                    return {
                        content: expr.key,
                        value: expr.id
                    };
                }

                return {
                    content: 'message',
                    value: expr.id
                };
            })
        }));

    const onOptionClick = (newGroupByExpressionId: string): void => {
        if (newGroupByExpressionId !== groupByExpressionId) {
            dispatch(setCurrentGroupByExpression({expressionIds: [newGroupByExpressionId]}));
        }
    };

    const onClear = (): void => {
        dispatch(setCurrentGroupByExpression({expressionIds: []}));
    };

    return <AdaptiveSelect
        options={groupByOptions}
        currentValue={groupByExpressionId}
        label={'Group by'}
        labelIcon={<Icon data={Cubes3Overlap}/>}
        onClear={onClear}
        onOptionClick={onOptionClick}
    />;
}
