import classNames from 'classnames';
import React, {ReactNode} from 'react';
import {Button, Icon, Label} from '@gravity-ui/uikit';
import {Camera, ChevronRight, ChevronUp, ChevronDown} from '@gravity-ui/icons';
import {TestTags} from '../../features/suites/components/TestTags';

import styles from './index.module.css';

interface SuiteTitleProps {
    className?: string;
    suitePath: string[];
    stateName?: string;
    index: number;
    totalItems: number;
    onPrevious: () => void;
    onNext: () => void;
}

export function SuiteTitle(props: SuiteTitleProps): ReactNode {
    const suiteName = props.suitePath[props.suitePath.length - 1];
    const suitePath = props.suitePath.slice(0, -1);

    return <div className={classNames(styles.container, props.className)}>
        <div className={styles.content}>
            {suitePath.length > 0 && <div className={classNames(styles.breadcrumbs)}>
                {suitePath.map((item, index) => (
                    <div key={index} className={styles.breadcrumbsItem}>
                        {item}
                        {index !== suitePath.length - 1 &&
                            <div className={styles.separator}>
                                <ChevronRight height={12}/>
                            </div>}
                    </div>
                ))}
            </div>}
            <div className={styles.titleContainer}>
                <h2 className={classNames('text-display-1')}>
                    {suiteName ?? 'Unknown Suite'}
                </h2>
                <div className={styles.labelsContainer}>
                    <TestTags />
                    {props.stateName && <Label theme='utility' size={'xs'} className={classNames(styles.label)}><Camera/>{props.stateName}</Label>}
                </div>
            </div>
        </div>
        <div className={styles.paginationContainer}>
            <span className={styles.counter} data-qa="suite-title-counter">{props.index === -1 ? '–' : props.index + 1}/{props.totalItems}</span>
            <Button qa='suite-prev' view={'flat'} disabled={props.index <= 0} onClick={props.onPrevious}><Icon
                data={ChevronUp}/></Button>
            <Button qa='suite-next' view={'flat'} disabled={props.index < 0 || props.index === props.totalItems - 1} onClick={props.onNext}><Icon
                data={ChevronDown}/></Button>
        </div>
    </div>;
}
