import classnames from 'classnames';
import React, {ReactNode, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import styles from './index.module.css';

const DEFAULT_ZOOM_LEVEL = 3;

interface ImageWithMagnifierProps {
    src: string;
    alt: string;
    className?: string;
    style?: React.CSSProperties;
    magnifierHeight?: number;
    magnifierWidth?: number;
    zoomLevel?: number;
    // Used to detect parent container scrolling and update the magnifier state
    scrollContainerRef?: React.RefObject<HTMLElement>;
}

export function ImageWithMagnifier({
    src,
    alt,
    className = '',
    style,
    magnifierHeight = 150,
    magnifierWidth = 150,
    zoomLevel = DEFAULT_ZOOM_LEVEL,
    scrollContainerRef
}: ImageWithMagnifierProps): ReactNode {
    const [showMagnifier, setShowMagnifier] = useState(false);
    const [[imgWidth, imgHeight], setSize] = useState([0, 0]);
    const [[x, y], setXY] = useState([0, 0]);
    const mousePositionRef = useRef([0, 0]);
    const [magnifierStyle, setMagnifierStyle] = useState({});
    const imgRef = useRef<HTMLImageElement>(null);

    const mouseEnter = (e: React.MouseEvent<HTMLImageElement>): void => {
        const el = e.currentTarget;

        const {width, height} = el.getBoundingClientRect();
        setSize([width, height]);
        setShowMagnifier(true);
        mousePositionRef.current = [e.clientX, e.clientY];
    };

    const mouseLeave = (e: React.MouseEvent<HTMLImageElement>): void => {
        e.preventDefault();
        setShowMagnifier(false);
        mousePositionRef.current = [e.clientX, e.clientY];
    };

    const mouseMove = (e: React.MouseEvent<HTMLImageElement>): void => {
        const el = e.currentTarget;
        const {top, left} = el.getBoundingClientRect();

        const x = e.clientX - left - window.scrollX;
        const y = e.clientY - top - window.scrollY;

        setXY([x, y]);
        mousePositionRef.current = [e.clientX, e.clientY];
    };

    useEffect(() => {
        if (showMagnifier && scrollContainerRef?.current && imgRef?.current) {
            const handleScroll = (): void => {
                if (!imgRef.current) {
                    return;
                }
                const [mouseX, mouseY] = mousePositionRef.current;

                const el = imgRef.current;
                const {top, left} = el.getBoundingClientRect();

                const x = mouseX - left - window.scrollX;
                const y = mouseY - top - window.scrollY;

                setXY([x, y]);
            };

            scrollContainerRef.current.addEventListener('scroll', handleScroll);

            return () => {
                scrollContainerRef.current?.removeEventListener('scroll', handleScroll);
            };
        }

        return undefined;
    }, [showMagnifier, scrollContainerRef]);

    useEffect(() => {
        const [mouseX, mouseY] = mousePositionRef.current;

        setMagnifierStyle({
            display: showMagnifier ? '' : 'none',
            height: `${magnifierHeight}px`,
            width: `${magnifierWidth}px`,
            backgroundImage: `url('${src}')`,
            top: `${mouseY - magnifierHeight / 2}px`,
            left: `${mouseX - magnifierWidth / 2}px`,
            backgroundSize: `${imgWidth * zoomLevel}px ${imgHeight * zoomLevel}px`,
            backgroundPositionX: `${-x * zoomLevel + magnifierWidth / 2}px`,
            backgroundPositionY: `${-y * zoomLevel + magnifierHeight / 2}px`
        });
    }, [showMagnifier, imgWidth, imgHeight, x, y]);

    return <div>
        <img
            src={src}
            className={classnames(className)}
            style={style}
            alt={alt}
            onMouseEnter={(e): void => mouseEnter(e)}
            onMouseLeave={(e): void => mouseLeave(e)}
            onMouseMove={(e): void => mouseMove(e)}
            ref={imgRef}
        />
        {createPortal(<div
            className={styles.magnifier}
            style={magnifierStyle}
        />, document.body)}
    </div>;
}
