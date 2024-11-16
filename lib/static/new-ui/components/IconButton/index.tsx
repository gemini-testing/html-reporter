import {Button, ButtonView, Tooltip} from '@gravity-ui/uikit';
import React, {ReactNode} from 'react';

interface IconButtonProps {
    icon: ReactNode;
    tooltip: string;
    onClick?: () => void;
    view?: ButtonView;
    disabled?: boolean;
    className?: string;
}

export function IconButton(props: IconButtonProps): ReactNode {
    return <Tooltip content={props.tooltip} placement={'top'} openDelay={0}>
        <Button className={props.className} view={props.view} onClick={props.onClick} disabled={props.disabled}>{props.icon}</Button>
    </Tooltip>;
}
