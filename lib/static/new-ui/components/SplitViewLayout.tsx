import classNames from 'classnames';
import React, {Children, ReactNode, useEffect} from 'react';
import {useSelector} from 'react-redux';
import Split from 'react-split';

import {KeepDraggingToHideCard} from '@/static/new-ui/components/Card/KeepDraggingToHideCard';
import {AnimatedAppearCard} from '@/static/new-ui/components/Card/AnimatedAppearCard';
import {getIsInitialized} from '@/static/new-ui/store/selectors';
import styles from './SplitViewLayout.module.css';
import {isSectionHidden} from '../features/suites/utils';

interface SplitViewLayoutProps {
    sizes: number[];
    onSizesChange?: (sizes: number[]) => void;
    children: React.ReactNode;
}

export function SplitViewLayout(props: SplitViewLayoutProps): ReactNode {
    const snapOffset = 200;
    const [wasDragged, setWasDragged] = React.useState(false);
    const [isDragging, setIsDragging] = React.useState(false);
    const [shouldDisableTransitions, setShouldDisableTransitions] = React.useState(false);
    const [isHiddenByIndex, setIsHiddenByIndex] = React.useState<boolean[]>(
        props.sizes.map(isSectionHidden)
    );

    const onDragHandler = (sizes: number[]): void => {
        props.onSizesChange?.(sizes);
    };

    const onDragStartHandler = (sizes: number[]): void => {
        setWasDragged(true);
        setIsDragging(true);
        props.onSizesChange?.(sizes);
    };

    const onDragEndHandler = (sizes: number[]): void => {
        setIsDragging(false);
        props.onSizesChange?.(sizes);
    };

    useEffect(() => {
        if (!isDragging) {
            setShouldDisableTransitions(true);
        } else {
            setShouldDisableTransitions(false);
        }
        setIsHiddenByIndex(props.sizes.map(isSectionHidden));
    }, [props.sizes]);

    const createGutter = (): HTMLDivElement => {
        const handle = document.createElement('div');
        handle.classList.add(styles.gutterHandle);
        handle.setAttribute('data-qa', 'split-view-gutter-handle');

        const gutter = document.createElement('div');
        gutter.appendChild(handle);
        gutter.classList.add(styles.gutter);

        return gutter;
    };

    const isInitialized = useSelector(getIsInitialized);
    const sections = Children.toArray(props.children);

    return <Split
        direction={'horizontal'}
        className={classNames(styles.split, {'is-resizing': isDragging, 'is-idle': wasDragged && !isDragging, 'is-initialized': isInitialized})}
        minSize={0} snapOffset={snapOffset}
        onDrag={onDragHandler}
        onDragStart={onDragStartHandler}
        onDragEnd={onDragEndHandler}
        gutter={createGutter}
        sizes={props.sizes}
    >
        {sections.map((section, index) =>
            <div
                key={index}
                className={classNames(styles.container, {[styles.containerCollapsed]: isHiddenByIndex[index], 'is-collapsed': isHiddenByIndex[index], [styles.isDisabledTransitions]: shouldDisableTransitions})}
            >
                <KeepDraggingToHideCard/>
                <AnimatedAppearCard/>
                {section}
            </div>)}
    </Split>;
}
