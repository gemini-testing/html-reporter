import {Button, ButtonView, Tooltip} from '@gravity-ui/uikit';
import React, {KeyboardEventHandler, MouseEventHandler, ReactNode} from 'react';

interface IconButtonProps {
    icon: ReactNode;
    tooltip: string;
    onClick?: MouseEventHandler;
    onKeyDown?: KeyboardEventHandler;
    view?: ButtonView;
    disabled?: boolean;
    className?: string;
    selected?: boolean;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButtonInternal(props, ref) {
    return <Tooltip content={props.tooltip} placement={'top'} openDelay={0}>
        <Button
            className={props.className}
            view={props.view}
            onClick={props.onClick}
            onKeyDown={props.onKeyDown}
            disabled={props.disabled}
            ref={ref}
            selected={props.selected}
        >
            {props.icon}
        </Button>
    </Tooltip>;
});
