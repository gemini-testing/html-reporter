import classNames from 'classnames';
import React, {ReactNode} from 'react';

import {Card, CardProps} from '.';
import styles from './UiCard.module.css';

export function UiCard(props: CardProps): ReactNode {
    return <Card className={classNames(styles.card, props.className)} style={props.style}>{props.children}</Card>;
}
