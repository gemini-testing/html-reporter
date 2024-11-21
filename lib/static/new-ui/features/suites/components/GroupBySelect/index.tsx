import {useDispatch, useSelector} from 'react-redux';
import {Select, SelectOptionGroup, SelectProps} from '@gravity-ui/uikit';
import {GroupByType} from '@/static/new-ui/types/store';
import {setCurrentGroupByExpression} from '@/static/modules/actions';
import React, {ReactNode} from 'react';

export function GroupBySelect(props: SelectProps): ReactNode {
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

    const onGroupByUpdate = (value: string[]): void => {
        const newGroupByExpressionId = value[0];
        if (newGroupByExpressionId !== groupByExpressionId) {
            dispatch(setCurrentGroupByExpression({expressionIds: newGroupByExpressionId ? [newGroupByExpressionId] : []}));
        }
    };

    return <Select view={'clear'} label='Group by' options={groupByOptions} onUpdate={onGroupByUpdate} value={[groupByExpressionId]} hasClear={Boolean(groupByExpressionId)} {...props}/>;
}
