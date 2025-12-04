import React, {ReactNode} from 'react';
import {Button, Icon, Tooltip} from '@gravity-ui/uikit';
import {IconData} from '@gravity-ui/uikit';

import styles from './index.module.css';
import classNames from 'classnames';

export {styles as badgeStyles};

interface BadgeProps {
    title?: string;
    icon?: IconData;
    onClick?: () => void;
    href?: string;
    className?: string;
    tooltip?: string;
    qa?: string;
}

export function Badge(props: BadgeProps): ReactNode {
    const {title, icon, onClick, href, className, tooltip, qa} = props;

    const button = (
        <Button
            size="xs"
            onClick={onClick}
            qa={qa}
            className={classNames(styles.badge, className)}
        >
            {icon && <Icon data={icon} size={14} />}
            {title}
        </Button>
    );

    const wrappedButton = href ? (
        <a href={href} target="_blank" rel="noreferrer">
            {button}
        </a>
    ) : button;

    if (tooltip) {
        return (
            <Tooltip content={tooltip}>
                {wrappedButton}
            </Tooltip>
        );
    }

    return wrappedButton;
}

