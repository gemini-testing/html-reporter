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
    const [isDragging, setIsDragging] = React.useState(false);
    const [isHiddenByIndex, setIsHiddenByIndex] = React.useState<boolean[]>([]);

    const onDragHandler = (sizes: number[]): void => {
        setIsHiddenByIndex(sizes.map(size => size < 1));
    };

    const onDragStartHandler = (): void => {
        setIsDragging(true);
    };

    const onDragEndHandler = (): void => {
        setIsDragging(false);
    };

    return <Split
        direction={'horizontal'}
        className={styles.split}
        minSize={0} snapOffset={snapOffset}
        onDrag={onDragHandler}
        onDragStart={onDragStartHandler}
        onDragEnd={onDragEndHandler}
    >
        {props.sections.map((section, index) =>
            <div
                key={index}
                className={classNames(styles.container, {[styles.containerCollapsed]: isHiddenByIndex[index], 'is-resizing': isDragging})}
            >
                <KeepDraggingToHideCard/>
                {section}
            </div>)}
    </Split>;
}
