import {Icon} from '@gravity-ui/uikit';
import {Grip} from '@gravity-ui/icons';
import classNames from 'classnames';
import React, {ReactNode, useState, useEffect} from 'react';
import {createPortal} from 'react-dom';

import styles from './index.module.css';
import {Point} from '@/static/new-ui/types';

interface ToolbarOverlayProps {
    isVisible: boolean | null;
    className?: string;
    children: ReactNode;
    draggable?: {
        offset: Point;
        onOffsetChange: (position: Point) => void;
    }
}

export function ToolbarOverlay(props: ToolbarOverlayProps): ReactNode {
    const [dragging, setDragging] = useState(false);
    const [startingPoint, setStartingPoint] = useState({x: 0, y: 0});

    const handleMouseDown = (e: React.MouseEvent): void => {
        if (!props.draggable) {
            return;
        }

        setDragging(true);
        setStartingPoint({
            x: e.clientX - props.draggable.offset.x,
            y: e.clientY - props.draggable.offset.y
        });
    };

    const handleMouseMove = (e: MouseEvent): void => {
        if (!dragging || !props.draggable) {
            return;
        }

        const newPosition = {
            x: e.clientX - startingPoint.x,
            y: e.clientY - startingPoint.y
        };
        props.draggable.onOffsetChange(newPosition);
    };

    const handleMouseUp = (): void => {
        setDragging(false);
    };

    useEffect(() => {
        if (dragging) {
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        } else {
            document.body.style.userSelect = 'auto';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.body.style.userSelect = 'auto';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragging]);

    return createPortal(<div
        style={props.draggable ? {'--x': props.draggable.offset.x, '--y': props.draggable.offset.y} as React.CSSProperties : {}}
        className={classNames(styles.container, props.className, {
            [styles.visible]: props.isVisible,
            [styles.dragging]: dragging
        })}
    >
        <div className={styles.iconContainer}>{props.draggable && <span onMouseDown={handleMouseDown}><Icon data={Grip} /></span>}</div>
        {props.children}
    </div>, document.body);
}
