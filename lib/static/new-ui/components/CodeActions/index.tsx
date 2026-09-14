import React, {ReactNode} from 'react';
import {Bars} from '@gravity-ui/icons';
import {Button, ClipboardButton, Icon} from '@gravity-ui/uikit';

import {WordWrapIcon} from './WordWrapIcon';

interface CodeActionsProps {
    clipboardText: string;
    lineWrappingEnabled: boolean;
    onToggleLineWrapping: () => void;
    className?: string;
    buttonClassName?: string;
    clipboardQa?: string;
    extraButton?: ReactNode;
}

export function CodeActions({
    clipboardText,
    lineWrappingEnabled,
    onToggleLineWrapping,
    className,
    buttonClassName,
    clipboardQa,
    extraButton
}: CodeActionsProps): ReactNode {
    return <div className={className}>
        <ClipboardButton
            className={buttonClassName}
            text={clipboardText}
            hasTooltip={false}
            qa={clipboardQa}
        />
        <Button
            className={buttonClassName}
            view={'flat'}
            size={'m'}
            title={'Toggle line wrapping'}
            onClick={onToggleLineWrapping}
        >
            <Button.Icon>
                <Icon data={lineWrappingEnabled ? Bars : WordWrapIcon} size={16}/>
            </Button.Icon>
        </Button>
        {extraButton}
    </div>;
}
