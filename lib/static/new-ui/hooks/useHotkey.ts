import {useEffect, useCallback} from 'react';

export interface UseHotkeyOptions {
    /** Whether the hotkey is enabled. Default: true */
    enabled?: boolean;
    /** Whether to trigger the hotkey even when an input/textarea is focused. Default: false */
    allowInInput?: boolean;
}

interface ParsedKey {
    key: string;
    code: string | null; // Physical key code (e.g., 'KeyS', 'Digit1')
    shift: boolean;
    meta: boolean;
    ctrl: boolean;
    alt: boolean;
    mod: boolean; // mod = meta on Mac, ctrl on others
}

/**
 * Maps a key string to its physical key code for keyboard layout independence.
 * Returns null if the key should be matched by event.key instead.
 */
function getKeyCode(key: string): string | null {
    const lowerKey = key.toLowerCase();

    if (/^[a-z]$/.test(lowerKey)) {
        return `Key${lowerKey.toUpperCase()}`;
    }

    if (/^[0-9]$/.test(lowerKey)) {
        return `Digit${lowerKey}`;
    }

    const codeMap: Record<string, string> = {
        ',': 'Comma',
        '.': 'Period',
        '/': 'Slash',
        ';': 'Semicolon',
        '\'': 'Quote',
        '[': 'BracketLeft',
        ']': 'BracketRight',
        '\\': 'Backslash',
        '`': 'Backquote',
        '-': 'Minus',
        '=': 'Equal',
        ' ': 'Space',
        'space': 'Space',
        'enter': 'Enter',
        'escape': 'Escape',
        'backspace': 'Backspace',
        'tab': 'Tab',
        'delete': 'Delete',
        'arrowup': 'ArrowUp',
        'arrowdown': 'ArrowDown',
        'arrowleft': 'ArrowLeft',
        'arrowright': 'ArrowRight'
    };

    if (codeMap[lowerKey]) {
        return codeMap[lowerKey];
    }

    return null;
}

function parseKey(keyString: string): ParsedKey {
    const parts = keyString.toLowerCase().split('+');
    const key = parts[parts.length - 1];

    return {
        key,
        code: getKeyCode(key),
        shift: parts.includes('shift'),
        meta: parts.includes('meta'),
        ctrl: parts.includes('ctrl'),
        alt: parts.includes('alt'),
        mod: parts.includes('mod')
    };
}

function isInputFocused(): boolean {
    const activeElement = document.activeElement;
    return activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement?.getAttribute('contenteditable') === 'true';
}

function matchesModifiers(event: KeyboardEvent, parsed: ParsedKey): boolean {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? event.metaKey : event.ctrlKey;

    if (parsed.mod) {
        if (
            !modKey ||
            (isMac && event.ctrlKey) ||
            (!isMac && event.metaKey)
        ) {
            return false;
        }
    } else {
        if (
            (!parsed.meta && event.metaKey) ||
            (!parsed.ctrl && event.ctrlKey)
        ) {
            return false;
        }
    }

    if (
        (parsed.shift !== event.shiftKey) ||
        (parsed.alt !== event.altKey) ||
        (parsed.meta && !event.metaKey) ||
        (parsed.ctrl && !event.ctrlKey)
    ) {
        return false;
    }

    return true;
}

export function useHotkey(
    keyString: string,
    callback: () => void,
    options: UseHotkeyOptions = {}
): void {
    const {enabled = true, allowInInput = false} = options;

    const handleKeyDown = useCallback((event: KeyboardEvent): void => {
        if (!enabled) {
            return;
        }
        if (!allowInInput && isInputFocused()) {
            return;
        }

        const parsed = parseKey(keyString);

        if (parsed.code) {
            if (event.code !== parsed.code) {
                return;
            }
        } else {
            const eventKey = event.key.toLowerCase();
            const targetKey = parsed.key.toLowerCase();
            if (eventKey !== targetKey) {
                return;
            }
        }

        if (!matchesModifiers(event, parsed)) {
            return;
        }

        event.preventDefault();
        callback();
    }, [keyString, callback, enabled, allowInInput]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);
}
