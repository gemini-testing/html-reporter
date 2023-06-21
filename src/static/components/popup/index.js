import React, {useRef, useState, useEffect} from 'react';
import PropTypes from 'prop-types';

import useElementSize from '../../hooks/useElementSize';
import useWindowSize from '../../hooks/useWindowSize';

import './index.styl';

const OVERFLOW_BORDER = 20;

const Popup = (props) => {
    const {action, target, children, ...rest} = props;

    const isClickHandled = useRef(false);
    const [show, setShow] = useState(false);
    const {width: windowWidth} = useWindowSize();
    const [targetRef, targetPos] = useElementSize();
    const [popupRef, popupPos] = useElementSize();

    const handleClick = (newState, {isLast} = {}) => {
        if (!isClickHandled.current) {
            isClickHandled.current = true;
            setShow(newState);
        }
        if (isLast) {
            isClickHandled.current = false;
        }
    };

    const xOffset = targetPos.left + targetPos.width / 2;
    const yOffset = targetPos.top + targetPos.height;

    const overflowRight = Math.max(xOffset + popupPos.width / 2 - windowWidth + OVERFLOW_BORDER, 0);
    const overflowLeft = Math.min(xOffset - popupPos.width / 2 - OVERFLOW_BORDER, 0);
    const overflow = overflowLeft || overflowRight;

    const mouseEnterHandler = action === 'hover' ? () => setShow(true) : null;
    const mouseLeaveHandler = action === 'hover' ? () => setShow(false) : null;

    const mouseClickTargetHandler = action === 'click' ? () => handleClick(s => !s) : null;
    const mouseClickOuterHandler = action === 'click' ? () => handleClick(true) : null;
    const mouseClickAwayHandler = action === 'click' ? () => handleClick(false, {isLast: true}) : null;

    useEffect(() => {
        if (mouseClickAwayHandler) {
            window.addEventListener('click', mouseClickAwayHandler);

            return () => window.removeEventListener('click', mouseClickAwayHandler);
        }
    }), [];

    return (
        <span
            {...rest}
            onMouseEnter={mouseEnterHandler}
            onMouseLeave={mouseLeaveHandler}
            onClick={mouseClickOuterHandler}
        >
            {React.cloneElement(target, {
                ref: targetRef,
                onClick: mouseClickTargetHandler
            })}
            <span
                className={`popup popup_${show ? 'visible' : 'hidden'}`}
                style={{left: xOffset, top: yOffset}}
            >
                <div className='popup__pointer' />
                <div
                    ref={popupRef}
                    className='popup__content'
                    style={{transform: `translate(${-overflow}px)`}}
                >
                    {children}
                </div>
            </span>
        </span>
    );
};

Popup.propTypes = {
    action: PropTypes.oneOf(['hover', 'click']).isRequired,
    target: PropTypes.node.isRequired
};

export default Popup;
