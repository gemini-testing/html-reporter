import {useState, useCallback, useLayoutEffect} from 'react';

import useEventListener from './useEventListener';

export default function useElementSize() {
    const [ref, setRef] = useState(null);
    const [size, setSize] = useState({
        width: 0,
        height: 0,
        left: 0,
        top: 0
    });

    const handlePosition = useCallback(() => {
        setSize({
            width: ref && ref.offsetWidth || 0,
            height: ref && ref.offsetHeight || 0,
            left: ref && ref.offsetLeft || 0,
            top: ref && ref.offsetTop || 0
        });
    }, [ref && ref.offsetHeight, ref && ref.offsetWidth, ref && ref.offsetLeft, ref && ref.offsetTop]);

    useEventListener('resize', handlePosition);

    useLayoutEffect(() => {
        handlePosition();
    }, [ref && ref.offsetHeight, ref && ref.offsetWidth, ref && ref.offsetLeft, ref && ref.offsetTop]);

    return [setRef, size];
}
