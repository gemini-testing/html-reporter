import classNames from 'classnames';
import React, {ReactNode} from 'react';

import styles from './index.module.css';

interface TestStepArgsProps {
    args: string[];
    isFailed?: boolean;
}

export function TestStepArgs(props: TestStepArgsProps): ReactNode {
    const renderItems = (index: number): ReactNode => {
        if (index >= props.args.length) {
            return null;
        }

        return <div className={classNames(styles.wrapper, styles.collapseFirst)}>
            <span className={classNames([styles.item, styles.collapseSecond, {
                [styles['item--failed']]: props.isFailed
            }])}>{props.args[index] ?? 'null'}</span>
            {renderItems(index + 1)}
        </div>;
    };

    return renderItems(0);
}
