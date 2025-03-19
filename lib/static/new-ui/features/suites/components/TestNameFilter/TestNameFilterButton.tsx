import React, {ReactNode} from 'react';
import {Button, Tooltip} from '@gravity-ui/uikit';

interface TestNameFilterButtonProps {
    children: ReactNode,
    selected: boolean,
    tooltip: string;
    onClick?: () => void;
    className?: string
}

export function TestNameFilterButton(props: TestNameFilterButtonProps): ReactNode {
    return <Tooltip content={props.tooltip} placement={'top'} openDelay={0}>
        <Button
            size='s'
            selected={props.selected}
            onClick={props.onClick}
            view={'flat'}
            className={props.className}
        >
            {props.children}
        </Button>
    </Tooltip>;
}
