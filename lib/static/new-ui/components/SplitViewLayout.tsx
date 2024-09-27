import classNames from 'classnames';
import React, {ReactNode} from 'react';
import Split from 'react-split';
import styles from './SplitViewLayout.module.css';
import {KeepDraggingToHideCard} from '@/static/new-ui/components/Card/KeepDraggingToHideCard';

interface SplitViewLayoutProps {
    sections: React.ReactNode[];
}

export function SplitViewLayout(props: SplitViewLayoutProps): ReactNode {
    const snapOffset = 200;
    const [wasDragged, setWasDragged] = React.useState(false);
    const [isDragging, setIsDragging] = React.useState(false);
    const [isHiddenByIndex, setIsHiddenByIndex] = React.useState<boolean[]>([]);

    const onDragHandler = (sizes: number[]): void => {
        setIsHiddenByIndex(sizes.map(size => size < 1));
    };

    const onDragStartHandler = (): void => {
        setWasDragged(true);
        setIsDragging(true);
    };

    const onDragEndHandler = (): void => {
        setIsDragging(false);
    };

    const createGutter = (): HTMLDivElement => {
        const handle = document.createElement('div');
        handle.classList.add(styles.gutterHandle);

        const gutter = document.createElement('div');
        gutter.appendChild(handle);
        gutter.classList.add(styles.gutter);

        return gutter;
    };

    return <Split
        direction={'horizontal'}
        className={classNames(styles.split, {'is-resizing': isDragging, 'is-idle': wasDragged && !isDragging})}
        minSize={0} snapOffset={snapOffset}
        onDrag={onDragHandler}
        onDragStart={onDragStartHandler}
        onDragEnd={onDragEndHandler}
        gutter={createGutter}
    >
        {props.sections.map((section, index) =>
            <div
                key={index}
                className={classNames(styles.container, {[styles.containerCollapsed]: isHiddenByIndex[index], 'is-collapsed': isHiddenByIndex[index]})}
            >
                <KeepDraggingToHideCard/>
                {section}
            </div>)}
    </Split>;
}
