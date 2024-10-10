import {Flex, Skeleton} from '@gravity-ui/uikit';
import React, {ReactNode} from 'react';

export function AssertViewResultSkeleton(): ReactNode {
    return <Flex direction={'column'} gap={4} style={{marginTop: '12px'}}>
        {/* Breadcrumbs */}
        <Flex gap={2}>
            <Skeleton style={{height: '12px', width: '15%'}}/>
            <Skeleton style={{height: '12px', width: '25%'}}/>
        </Flex>
        {/* Title */}
        <Flex gap={2}><Skeleton style={{height: '24px', width: '40%'}}/></Flex>
        {/* Toolbar */}
        <Flex gap={2}>
            <Skeleton style={{height: '12px', width: '150px'}}/>
            <Skeleton style={{height: '12px', width: '180px'}}/>
            <Skeleton style={{height: '12px', width: '120px'}}/>
        </Flex>
        {/* Image title */}
        <Flex gap={2}><Skeleton style={{height: '12px', width: '25%'}}/></Flex>
        {/* Images*/}
        <Flex gap={2}>
            <Skeleton style={{height: '500px'}}/>
            <Skeleton style={{height: '500px'}}/>
            <Skeleton style={{height: '500px'}}/>
        </Flex>
    </Flex>;
}
