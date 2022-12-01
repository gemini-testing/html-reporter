import {useState, useLayoutEffect} from 'react';

import useEventListener from './useEventListener';

export default function useWindowSize() {
    const [windowSize, setWindowSize] = useState({
        width: 0,
        height: 0
    });

    const handleSize = () => {
        setWindowSize({
            width: window.innerWidth,
            height: window.innerHeight
        });
    };

    useEventListener('resize', handleSize);

    useLayoutEffect(() => {
        handleSize();
    }, []);

    return windowSize;
}
