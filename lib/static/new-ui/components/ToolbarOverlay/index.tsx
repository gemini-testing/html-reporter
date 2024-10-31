import {Icon} from '@gravity-ui/uikit';
import {Grip} from '@gravity-ui/icons';
import classNames from 'classnames';
import React, {ReactNode, useState} from 'react';
import {createPortal} from 'react-dom';

import styles from './index.module.css';
import {Point} from '@/static/new-ui/types';

interface ToolbarOverlayProps {
    isVisible: boolean | null;
    className?: string;
    children: ReactNode;
    draggable?: {
        position: Point;
        onPositionChange: (position: Point) => void;
    }
}

export function ToolbarOverlay(props: ToolbarOverlayProps): ReactNode {
    const [dragging, setDragging] = useState(false);
    const [offset, setOffset] = useState({x: 0, y: 0});

    const handleMouseDown = (e: React.MouseEvent): void => {
        if (!props.draggable) {
            return;
        }

        setDragging(true);
        setOffset({
            x: e.clientX - props.draggable.position.x,
            y: e.clientY - props.draggable.position.y
        });
    };

    const handleMouseMove = (e: MouseEvent): void => {
        if (!dragging || !props.draggable) {
            return;
        }

        const newPosition = {
            x: e.clientX - offset.x,
            y: e.clientY - offset.y
        };
        props.draggable.onPositionChange(newPosition);
    };

    const handleMouseUp = (): void => {
        setDragging(false);
    };

    React.useEffect(() => {
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
        style={props.draggable ? {'--x': props.draggable.position.x, '--y': props.draggable.position.y} as React.CSSProperties : {}}
        className={classNames(styles.container, props.className, {
            [styles.visible]: props.isVisible,
            [styles.dragging]: dragging
        })}
    >
        <div className={styles.iconContainer}>{props.draggable && <span onMouseDown={handleMouseDown}><Icon data={Grip} /></span>}</div>
        {props.children}
    </div>, document.body);
}
