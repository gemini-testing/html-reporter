import {Cubes3Overlap} from '@gravity-ui/icons';
import {Icon, Select} from '@gravity-ui/uikit';
import React, {ReactNode, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {GroupByType} from '@/static/new-ui/types/store';
import {setCurrentGroupByExpression} from '@/static/modules/actions';
import {AdaptiveSelect} from '@/static/new-ui/components/AdaptiveSelect';

export function GroupBySelect(): ReactNode {
    const dispatch = useDispatch();

    const NO_GROUPING = 'no-grouping';

    const groupByExpressionId = useSelector((state) => state.app.groupTestsData.currentExpressionIds)[0];

    const groupBySections = useSelector((state) => state.app.groupTestsData.availableSections);
    const groupByExpressions = useSelector((state) => state.app.groupTestsData.availableExpressions);

    const [selectValue, setSelectValue] = useState<string>(NO_GROUPING);

    const onOptionClick = (newGroupByExpressionId: string): void => {
        if (newGroupByExpressionId === NO_GROUPING) {
            setSelectValue(NO_GROUPING);
            dispatch(setCurrentGroupByExpression({expressionIds: []}));
        } else if (newGroupByExpressionId !== groupByExpressionId) {
            setSelectValue(newGroupByExpressionId);
            dispatch(setCurrentGroupByExpression({expressionIds: [newGroupByExpressionId]}));
        }
    };

    const groupByOptions = [<Select.OptionGroup label={'Group by'} key={'no-grouping'}>
        <Select.Option value={NO_GROUPING}>
            <div onClick={(): void => onOptionClick(NO_GROUPING)}>Nothing</div>
        </Select.Option>
    </Select.OptionGroup>];

    groupByOptions.push(...groupBySections.map((section): React.JSX.Element =>
        <Select.OptionGroup label={section.label} key={section.id}>
            {groupByExpressions
                .filter(expr => expr.sectionId === section.id)
                .map(expr => {
                    const title = expr.type === GroupByType.Meta ? expr.key : 'message';

                    return <Select.Option
                        key={expr.id}
                        value={expr.id}
                        title={title}
                        content={<div onClick={(): void => onOptionClick(expr.id)}>{title}</div>}
                    />;
                })}
        </Select.OptionGroup>
    ));

    return <AdaptiveSelect
        multiple={true}
        autoClose={true}
        currentValue={[selectValue]}
        label={'Group by'}
        labelIcon={<Icon data={Cubes3Overlap}/>}
        showDot={selectValue !== NO_GROUPING}
    >
        {groupByOptions}
    </AdaptiveSelect>;
}
