import React, {ReactNode, useEffect, useState} from 'react';
import random from 'lodash/random';
import {Flex, Skeleton} from '@gravity-ui/uikit';
import styles from './TreeViewSkeleton.module.css';

export function TreeViewSkeleton(): ReactNode {
    const [skeletons, setSkeletons] = useState<ReactNode[]>([]);
    useEffect(() => {
        let currentLevel = 0;
        const skeletons: ReactNode[] = [];
        for (let i = 0; i < 24; i++) {
            const level = random(0, currentLevel + 1);
            currentLevel = level;

            skeletons.push(<Skeleton key={i} className={styles.skeleton} style={{
                width: `calc(100% - ${level} * 24px)`,
                '--delay': Math.floor(i / 2) + 's'} as React.CSSProperties}
            />);
        }

        setSkeletons(skeletons);
    }, []);

    return <Flex direction='column' gap={3} alignItems={'end'}>
        {skeletons}
    </Flex>;
}
