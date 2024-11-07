import classNames from 'classnames';
import React, {ReactNode} from 'react';

import {Card, CardProps} from '.';
import styles from './TextHintCard.module.css';

interface TextHintCardProps extends CardProps {
    children: ReactNode;
}

export function TextHintCard(props: TextHintCardProps): ReactNode {
    return <Card className={classNames(styles.card, props.className)}>{props.children}</Card>;
}
