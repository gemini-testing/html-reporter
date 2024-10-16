import classNames from 'classnames';
import React, {ReactNode} from 'react';
import {useSelector} from 'react-redux';
import Split from 'react-split';

import {KeepDraggingToHideCard} from '@/static/new-ui/components/Card/KeepDraggingToHideCard';
import {AnimatedAppearCard} from '@/static/new-ui/components/Card/AnimatedAppearCard';
import {getIsInitialized} from '@/static/new-ui/store/selectors';
import styles from './SplitViewLayout.module.css';

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

    const isInitialized = useSelector(getIsInitialized);
    const sizes = props.sections.length > 1 ? [25, 75] : [100];

    return <Split
        direction={'horizontal'}
        className={classNames(styles. split, {'is-resizing': isDragging, 'is-idle': wasDragged && !isDragging, 'is-initialized': isInitialized})}
        minSize={0} snapOffset={snapOffset}
        onDrag={onDragHandler}
        onDragStart={onDragStartHandler}
        onDragEnd={onDragEndHandler}
        gutter={createGutter}
        sizes={sizes}
    >
        {props.sections.map((section, index) =>
            <div
                key={index}
                className={classNames(styles.container, {[styles.containerCollapsed]: isHiddenByIndex[index], 'is-collapsed': isHiddenByIndex[index]})}
            >
                <KeepDraggingToHideCard/>
                <AnimatedAppearCard/>
                {section}
            </div>)}
    </Split>;
}
