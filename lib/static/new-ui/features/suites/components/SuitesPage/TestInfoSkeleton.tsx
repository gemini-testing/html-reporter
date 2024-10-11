import {Flex, Skeleton} from '@gravity-ui/uikit';
import random from 'lodash/random';
import React, {ReactNode, useEffect, useState} from 'react';

export function TestInfoSkeleton(): ReactNode {
    const [metaSkeletons, setMetaSkeletons] = useState<ReactNode[]>([]);
    const [stepsSkeletons, setStepsSkeletons] = useState<ReactNode[]>([]);

    useEffect(() => {
        const newMetaSkeletons = [];
        for (let i = 0; i < random(3, 6); i++) {
            newMetaSkeletons.push(<Flex gap={2} key={i}>
                <Skeleton style={{height: '12px', width: `${random(20, 35)}%`}}/>
                <Skeleton style={{height: `${random(1, 3) * 24}px`, width: '40%', marginLeft: 'auto'}}/>
            </Flex>);
        }

        setMetaSkeletons(newMetaSkeletons);

        const newStepsSkeletons = [];
        for (let i = 0; i < random(8, 12); i++) {
            newStepsSkeletons.push(<Flex gap={2} key={i}>
                <Skeleton style={{height: '24px', width: `${random(60, 80)}%`}}/>
                <Skeleton style={{height: '12px', width: `${random(5, 8)}%`, marginLeft: 'auto'}}/>
            </Flex>);
        }

        setStepsSkeletons(newStepsSkeletons);
    }, []);

    return <Flex direction={'column'} gap={4}>
        {/* Breadcrumbs */}
        <Flex gap={2}><Skeleton style={{height: '12px', width: '20%'}}/><Skeleton style={{height: '12px', width: '35%'}}/></Flex>
        {/* Title */}
        <Flex gap={2}><Skeleton style={{height: '24px', width: '40%'}}/></Flex>
        {/* Attempts */}
        <Flex gap={2}><Skeleton style={{height: '20px', width: '20%'}}/></Flex>
        {/* Meta */}
        <Flex gap={2}><Skeleton style={{height: '20px', width: '25%'}}/></Flex>
        {metaSkeletons}
        {/* Steps */}
        <Flex gap={2}><Skeleton style={{height: '20px', width: '20%'}}/></Flex>
        {stepsSkeletons}
    </Flex>;
}
