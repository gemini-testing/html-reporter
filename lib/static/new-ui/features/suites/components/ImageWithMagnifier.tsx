import React, {ReactNode, useEffect, useState} from 'react';
import {createPortal} from 'react-dom';

interface ImageWithMagnifierProps {
    src: string;
    alt: string;
    className?: string;
    style?: React.CSSProperties;
    magnifierHeight?: number;
    magnifierWidth?: number;
    zoomLevel?: number;
}

export function ImageWithMagnifier({
    src,
    alt,
    className = '',
    style,
    magnifierHeight = 150,
    magnifierWidth = 150,
    zoomLevel = 3
}: ImageWithMagnifierProps): ReactNode {
    const [showMagnifier, setShowMagnifier] = useState(false);
    const [[imgWidth, imgHeight], setSize] = useState([0, 0]);
    const [[x, y], setXY] = useState([0, 0]);
    const [[mouseX, mouseY], setMouseXY] = useState([0, 0]);
    const [magnifierStyle, setMagnifierStyle] = useState({});

    const mouseEnter = (e: React.MouseEvent<HTMLImageElement>): void => {
        const el = e.currentTarget;

        const {width, height} = el.getBoundingClientRect();
        setSize([width, height]);
        setShowMagnifier(true);
        setMouseXY([e.clientX, e.clientY]);
    };

    const mouseLeave = (e: React.MouseEvent<HTMLImageElement>): void => {
        e.preventDefault();
        setShowMagnifier(false);
        setMouseXY([e.clientX, e.clientY]);
    };

    const mouseMove = (e: React.MouseEvent<HTMLImageElement>): void => {
        const el = e.currentTarget;
        const {top, left} = el.getBoundingClientRect();

        const x = e.pageX - left - window.scrollX;
        const y = e.pageY - top - window.scrollY;

        setXY([x, y]);
        setMouseXY([e.clientX, e.clientY]);
    };

    useEffect(() => {
        setMagnifierStyle({
            display: showMagnifier ? '' : 'none',
            // position: 'absolute',
            position: 'fixed',
            pointerEvents: 'none',
            height: `${magnifierHeight}px`,
            width: `${magnifierWidth}px`,
            opacity: '1',
            border: '1px solid lightgrey',
            backgroundColor: 'white',
            borderRadius: '5px',
            backgroundImage: `url('${src}')`,
            backgroundRepeat: 'no-repeat',
            top: `${mouseY - magnifierHeight / 2}px`,
            left: `${mouseX - magnifierWidth / 2}px`,
            backgroundSize: `${imgWidth * zoomLevel}px ${imgHeight * zoomLevel}px`,
            backgroundPositionX: `${-x * zoomLevel + magnifierWidth / 2}px`,
            backgroundPositionY: `${-y * zoomLevel + magnifierHeight / 2}px`,
            zIndex: 1000
        });
    }, [showMagnifier, imgWidth, imgHeight, x, y]);

    return <div className="relative inline-block">
        <img
            src={src}
            className={className}
            style={style}
            alt={alt}
            onMouseEnter={(e): void => mouseEnter(e)}
            onMouseLeave={(e): void => mouseLeave(e)}
            onMouseMove={(e): void => mouseMove(e)}
        />
        <div></div>
        {createPortal(<div
            style={magnifierStyle}
        />, document.body)}
    </div>;
}
