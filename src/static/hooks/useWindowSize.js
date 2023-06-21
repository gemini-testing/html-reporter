import {useState, useLayoutEffect, useCallback} from 'react';

import useEventListener from './useEventListener';

export default function useWindowSize() {
    const [windowSize, setWindowSize] = useState({
        width: 0,
        height: 0
    });

    const handleSize = useCallback(() => {
        setWindowSize({
            width: window.innerWidth,
            height: window.innerHeight
        });
    }, [setWindowSize]);

    useEventListener('resize', handleSize);

    useLayoutEffect(() => {
        handleSize();
    }, []);

    return windowSize;
}
