import React, {useState, useCallback} from 'react';
import {throttle} from 'lodash';

import './index.styl';
import useEventListener from '../../hooks/useEventListener';

const MAX_SHOW_HEADER = 10;
const MIN_HIDE_HEADER = 30;

const StickyHeader = ({children}) => {
    const [scrollHeight, setScrollHeight] = useState(0);
    const shouldWrap = scrollHeight > MAX_SHOW_HEADER;
    const handleScroll = useCallback(throttle(() => {
        const shouldShow = scroll => (scroll < MAX_SHOW_HEADER && window.scrollY > MIN_HIDE_HEADER);
        const shouldHide = scroll => (scroll > MIN_HIDE_HEADER && window.scrollY < MAX_SHOW_HEADER);
        const shouldUpdate = scroll => shouldShow(scroll) || shouldHide(scroll);
        const cb = scroll => shouldUpdate(scroll)
            ? window.scrollY
            : scroll;

        setScrollHeight(cb);
    }, 100), [setScrollHeight]);

    useEventListener('scroll', handleScroll);

    return (
        <div className={`sticky-header sticky-header_${shouldWrap ? 'wrapped' : 'unwrapped'}`}>
            <div className="sticky-header__wrap" />
            <div className="sticky-header__content">
                {children}
            </div>
        </div>
    );
};

export default StickyHeader;
