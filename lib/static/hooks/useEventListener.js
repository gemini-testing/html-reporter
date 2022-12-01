import {useRef, useEffect, useLayoutEffect} from 'react';

export default function useEventListener(eventName, handler, element, options) {
    const savedHandler = useRef(handler);

    useLayoutEffect(() => {
        savedHandler.current = handler;
    }, [handler]);

    useEffect(() => {
        const targetElement = element && element.current || window;

        if (!targetElement || !targetElement.addEventListener) {
            return;
        }

        const listener = event => savedHandler.current(event);

        targetElement.addEventListener(eventName, listener, options);

        return () => {
            targetElement.removeEventListener(eventName, listener, options);
        };
    }, [eventName, element, options]);
}
