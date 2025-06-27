import React, {useState, useCallback, useRef} from 'react';
import {Button, ClipboardIcon} from '@gravity-ui/uikit';
import type {ButtonButtonProps} from '@gravity-ui/uikit';

export interface ClipboardButtonProps extends Omit<ButtonButtonProps, 'children'> {
    text: string;
    icon?: React.ReactNode;
}

type CopyStatus = 'pending' | 'success' | 'error';

// TODO: Use gravity-ui/uikit/ClipboardButton when https://github.com/gravity-ui/uikit/issues/2298 is fixed
export const ClipboardButton: React.FC<ClipboardButtonProps> = ({
    text,
    icon,
    size = 's',
    view = 'flat',
    title = 'Copy to clipboard',
    onClick,
    ...buttonProps
}) => {
    const [status, setStatus] = useState<CopyStatus>('pending');
    const timeoutRef = useRef<NodeJS.Timeout>();

    const copyToClipboard = useCallback((textToCopy: string): boolean => {
        try {
            const input = document.createElement('input');
            input.style.position = 'fixed';
            input.style.left = '-9999px';
            input.value = textToCopy;

            document.body.appendChild(input);
            input.select();
            input.setSelectionRange(0, 99999);

            const success = document.execCommand('copy');
            document.body.removeChild(input);

            return success;
        } catch (error) {
            console.error('Failed to copy text: ', error);
            return false;
        }
    }, []);

    const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        const success = copyToClipboard(text);

        if (success) {
            setStatus('success');

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                setStatus('pending');
            }, 1000);
        } else {
            setStatus('error');

            setTimeout(() => {
                setStatus('pending');
            }, 1000);
        }

        onClick?.(event);
    }, [text, onClick, copyToClipboard]);

    React.useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return <Button
        size={size}
        view={view}
        title={title}
        onClick={handleClick}
        {...buttonProps}
    >
        <Button.Icon>
            {icon || <ClipboardIcon status={status} />}
        </Button.Icon>
    </Button>;
};
